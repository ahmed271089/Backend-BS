# Chat System - Issues & Fixes Required

## Current Status: Issues Identified ⚠️

The chat system is **functionally complete** but has several **security and UX issues** that should be addressed before production.

---

## 🔴 Critical Issues (Security & Performance)

### 1. **Insecure CORS Configuration**
**Location:** `src/chat/chat.gateway.ts:23` and `src/main.ts:16`

**Current:**
```typescript
cors: { origin: '*' }
```

**Problem:** Allows any origin to connect, creating security vulnerabilities.

**Fix Required:**
```typescript
// In chat.gateway.ts
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:19006'],
    credentials: true,
  },
})

// In main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:19006'],
  credentials: true,
});
```

**Environment Variable Needed:**
```env
CORS_ORIGINS=http://localhost:19006,http://localhost:3001
```

---

### 2. **No Message Content Validation**
**Location:** `src/chat/dto/chat.dto.ts:8-19`

**Current:** Messages have no length limits or content validation.

**Problems:**
- Users can send extremely long messages
- Empty messages can be sent
- No URL validation for attachments

**Fix Required:**
```typescript
import { IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  @ValidateIf((o) => !o.attachmentUrl || o.content)
  content?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Attachment must be a valid URL' })
  @MaxLength(2048, { message: 'Attachment URL is too long' })
  @ValidateIf((o) => !o.content || o.attachmentUrl)
  attachmentUrl?: string;
}
```

**Additional Service Validation in `chat.service.ts:79-89`:**
```typescript
async createMessage(conversationId: string, senderId: string, content?: string, attachmentUrl?: string) {
  await this.assertParticipant(conversationId, senderId);
  
  if (!content && !attachmentUrl) {
    throw new BadRequestException('Message must have content or an attachment');
  }

  if (content && content.trim().length === 0) {
    throw new BadRequestException('Message content cannot be empty');
  }

  if (content && content.length > 5000) {
    throw new BadRequestException('Message content exceeds maximum length of 5000 characters');
  }

  return this.prisma.message.create({
    data: { 
      conversationId, 
      senderId, 
      content: content?.trim(), 
      attachmentUrl 
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });
}
```

---

### 3. **No Rate Limiting on WebSocket Messages**
**Location:** WebSocket gateway has no rate limiting

**Problem:** Users can spam unlimited messages, potentially:
- Overloading the server
- Flooding other users
- Creating DoS conditions

**Fix Required:**

**Step 1:** Create Rate Limit Guard - `src/chat/guards/rate-limit.guard.ts`
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class WsRateLimitGuard implements CanActivate {
  private rateLimits = new Map<string, RateLimitEntry>();
  private readonly windowMs = 60000; // 1 minute
  private readonly maxMessages = 60; // 60 messages per minute

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const userId = (client as any).user?.userId;

    if (!userId) return false;

    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);

    if (Math.random() < 0.01) {
      this.cleanup(now);
    }

    if (!userLimit || now > userLimit.resetAt) {
      this.rateLimits.set(userId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (userLimit.count >= this.maxMessages) {
      client.emit('rate_limit_exceeded', {
        message: 'Too many messages. Please slow down.',
        retryAfter: Math.ceil((userLimit.resetAt - now) / 1000),
      });
      return false;
    }

    userLimit.count++;
    return true;
  }

  private cleanup(now: number) {
    for (const [userId, entry] of this.rateLimits.entries()) {
      if (now > entry.resetAt) {
        this.rateLimits.delete(userId);
      }
    }
  }
}
```

**Step 2:** Update `src/chat/chat.module.ts`
```typescript
import { WsRateLimitGuard } from './guards/rate-limit.guard';

@Module({
  providers: [ChatService, ChatGateway, WsJwtGuard, WsRateLimitGuard],
  // ...
})
```

**Step 3:** Apply to Gateway `src/chat/chat.gateway.ts`
```typescript
import { WsRateLimitGuard } from './guards/rate-limit.guard';

// Apply to send_message and typing events
@UseGuards(WsJwtGuard, WsRateLimitGuard)
@SubscribeMessage('send_message')
async sendMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() dto: SendMessageDto) {
  // ...
}

@UseGuards(WsJwtGuard, WsRateLimitGuard)
@SubscribeMessage('typing')
typing(@ConnectedSocket() client: AuthedSocket, @MessageBody() dto: TypingDto) {
  // ...
}
```

---

## 🟡 Important UX Issues (Mobile App)

### 4. **Poor Reconnection Feedback**
**Location:** `Mobile-App-BS/src/api/socket.tsx`

**Problem:** When connection is lost, users don't know:
- If the app is reconnecting
- Why the connection failed
- How long until retry

**Fix Required:**

Update the `SocketContextValue` interface:
```typescript
interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;      // ADD
  error: string | null;     // ADD
  connect: () => Promise<void>;
  disconnect: () => void;
}
```

Enhance connection handling:
```typescript
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = React.useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setError('No authentication token found');
      return;
    }

    setConnecting(true);
    setError(null);

    const newSocket = io(`${SOCKET_BASE_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      reconnectAttempts.current++;
      setConnecting(false);
      setConnected(false);
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('Unable to connect. Please check your internet connection.');
      } else {
        setError(`Connection failed. Retrying... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      }
    });

    newSocket.on('rate_limit_exceeded', (data: any) => {
      setError(data.message);
    });

    setSocket((prev) => {
      prev?.disconnect();
      return newSocket;
    });
  }, []);

  // Return enhanced context
  return (
    <SocketContext.Provider value={{ socket, connected, connecting, error, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}
```

---

### 5. **No Message Delivery Status**
**Location:** `Mobile-App-BS/src/screens/Chat/ChatThreadScreen.tsx`

**Problem:** Users don't know if their message was:
- Being sent
- Successfully delivered
- Failed to send

**Fix Required:**

Update ChatThreadScreen.tsx:
```typescript
const [sendingMessage, setSendingMessage] = useState(false);
const { socket, connected, connecting, error } = useSocket();

const handleSend = () => {
  if (!draft.trim() || !socket || !connected) return;
  
  const messageContent = draft.trim();
  if (messageContent.length > 5000) {
    Alert.alert('Error', 'Message is too long. Maximum 5000 characters.');
    return;
  }

  setSendingMessage(true);
  socket.emit('send_message', { conversationId, content: messageContent }, (response: any) => {
    setSendingMessage(false);
    if (response?.error) {
      Alert.alert('Error', response.error);
    }
  });
  setDraft('');
};

// Update header status
<Text style={[styles.headerStatus, error && { color: colors.error }]}>
  {error ? 'Connection error' : 
   connecting ? 'Connecting…' : 
   !connected ? 'Offline' : 
   otherTyping ? 'Typing…' : 
   'Online'}
</Text>

// Update send button
<Pressable 
  onPress={handleSend} 
  style={[
    styles.sendBtn, 
    (!draft.trim() || !connected || sendingMessage) && styles.sendBtnDisabled
  ]} 
  disabled={!draft.trim() || !connected || sendingMessage}
>
  {sendingMessage ? (
    <ActivityIndicator size="small" color={colors.white} />
  ) : (
    <Ionicons name="arrow-up" size={18} color={colors.white} />
  )}
</Pressable>
```

---

## 📊 Summary

| Issue | Severity | Status | Impact |
|-------|----------|--------|---------|
| CORS Configuration | 🔴 Critical | Not Fixed | Security vulnerability |
| Message Validation | 🔴 Critical | Not Fixed | Allows spam/abuse |
| Rate Limiting | 🔴 Critical | Not Fixed | DoS risk |
| Reconnection UI | 🟡 Important | Not Fixed | Poor UX |
| Message Status | 🟡 Important | Not Fixed | Confusing UX |

---

## Implementation Priority

1. **First:** Fix CORS (5 minutes)
2. **Second:** Add message validation (10 minutes)
3. **Third:** Implement rate limiting (20 minutes)
4. **Fourth:** Enhance socket reconnection (15 minutes)
5. **Fifth:** Add message status indicators (10 minutes)

**Total estimated time:** ~60 minutes

---

## Testing Checklist

After implementing fixes, test:

- [ ] CORS blocks unauthorized origins
- [ ] Messages over 5000 chars are rejected
- [ ] Empty messages are rejected
- [ ] Invalid attachment URLs are rejected
- [ ] Sending 61 messages in 1 minute triggers rate limit
- [ ] Rate limit error is shown to user
- [ ] Connection status displays correctly
- [ ] Reconnection attempts are visible
- [ ] Send button shows loading state
- [ ] Offline messages are queued (if implemented)
