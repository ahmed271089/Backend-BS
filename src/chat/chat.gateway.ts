import { Logger, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { JoinConversationDto, SendMessageDto, TypingDto } from './dto/chat.dto';

interface AuthedSocket extends Socket {
  user?: { userId: string; role: string };
}

@WebSocketGateway({
  namespace: "/chat",
  cors: { origin: '*' }, // tighten to your app's origin(s) in production
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // userId -> set of socket ids (a user can have multiple devices/tabs open)
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwt: JwtService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        client.handshake.headers.authorization?.replace("Bearer ", "");
      if (!token) throw new Error("Missing token");

      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.user = { userId: payload.sub, role: payload.role };

      this.addOnlineSocket(payload.sub, client.id);
      this.logger.log(`User ${payload.sub} connected (${client.id})`);

      // Auto-join a personal room so other services/gateways can push events
      // to this user by userId without tracking socket ids themselves.
      client.join(`user:${payload.sub}`);
    } catch (err) {
      this.logger.warn(
        `Rejected unauthenticated socket connection: ${(err as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.user) {
      this.removeOnlineSocket(client.user.userId, client.id);
      this.logger.log(`User ${client.user.userId} disconnected (${client.id})`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("join_conversation")
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    await this.chatService.assertParticipant(
      dto.conversationId,
      client.user!.userId,
    );
    client.join(`conversation:${dto.conversationId}`);
    return { event: "joined_conversation", conversationId: dto.conversationId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("leave_conversation")
  leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    client.leave(`conversation:${dto.conversationId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("send_message")
  async sendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.user!.userId;
    const message = await this.chatService.createMessage(
      dto.conversationId,
      userId,
      dto.content,
      dto.attachmentUrl,
    );

    // Broadcast to everyone currently in the conversation room (including sender,
    // so all of the sender's own devices/tabs stay in sync).
    this.server
      .to(`conversation:${dto.conversationId}`)
      .emit("new_message", message);

    // Push a lightweight notification to participants who aren't in the room
    // right now (e.g. app in background) via their personal user:<id> room.
    const otherUserIds = await this.chatService.getOtherParticipantIds(
      dto.conversationId,
      userId,
    );
    for (const otherId of otherUserIds) {
      this.server.to(`user:${otherId}`).emit("message_notification", {
        conversationId: dto.conversationId,
        from: message.sender,
        preview: message.content ?? "📎 Attachment",
      });
    }

    return message;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("typing")
  typing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: TypingDto,
  ) {
    this.server
      .to(`conversation:${dto.conversationId}`)
      .except(client.id)
      .emit("typing", {
        conversationId: dto.conversationId,
        userId: client.user!.userId,
      });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("check_user_status")
  checkUserStatus(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() dto: { userId: string },
  ) {
    return { isOnline: this.isUserOnline(dto.userId) };
  }

  isUserOnline(userId: string): boolean {
    return (this.onlineUsers.get(userId)?.size ?? 0) > 0;
  }

  // Lets other modules (e.g. notifications) push to a user without
  // needing to know their socket id — just their userId.
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private addOnlineSocket(userId: string, socketId: string) {
    const wasOnline = this.isUserOnline(userId);
    if (!this.onlineUsers.has(userId)) this.onlineUsers.set(userId, new Set());
    this.onlineUsers.get(userId)!.add(socketId);
    if (!wasOnline) {
      this.server.emit("user_status_changed", { userId, isOnline: true });
    }
  }

  private removeOnlineSocket(userId: string, socketId: string) {
    this.onlineUsers.get(userId)?.delete(socketId);
    if (this.onlineUsers.get(userId)?.size === 0) {
      this.onlineUsers.delete(userId);
      this.server.emit("user_status_changed", { userId, isOnline: false });
    }
  }
}
