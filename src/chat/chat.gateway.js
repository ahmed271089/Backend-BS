var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Logger, UseGuards } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer, } from '@nestjs/websockets';
import { WsJwtGuard } from './guards/ws-jwt.guard';
let ChatGateway = (() => {
    let _classDecorators = [WebSocketGateway({
            namespace: '/chat',
            cors: { origin: '*' }, // tighten to your app's origin(s) in production
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _server_decorators;
    let _server_initializers = [];
    let _server_extraInitializers = [];
    let _joinConversation_decorators;
    let _leaveConversation_decorators;
    let _sendMessage_decorators;
    let _typing_decorators;
    var ChatGateway = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _server_decorators = [WebSocketServer()];
            _joinConversation_decorators = [UseGuards(WsJwtGuard), SubscribeMessage('join_conversation')];
            _leaveConversation_decorators = [UseGuards(WsJwtGuard), SubscribeMessage('leave_conversation')];
            _sendMessage_decorators = [UseGuards(WsJwtGuard), SubscribeMessage('send_message')];
            _typing_decorators = [UseGuards(WsJwtGuard), SubscribeMessage('typing')];
            __esDecorate(this, null, _joinConversation_decorators, { kind: "method", name: "joinConversation", static: false, private: false, access: { has: obj => "joinConversation" in obj, get: obj => obj.joinConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _leaveConversation_decorators, { kind: "method", name: "leaveConversation", static: false, private: false, access: { has: obj => "leaveConversation" in obj, get: obj => obj.leaveConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendMessage_decorators, { kind: "method", name: "sendMessage", static: false, private: false, access: { has: obj => "sendMessage" in obj, get: obj => obj.sendMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _typing_decorators, { kind: "method", name: "typing", static: false, private: false, access: { has: obj => "typing" in obj, get: obj => obj.typing }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, null, _server_decorators, { kind: "field", name: "server", static: false, private: false, access: { has: obj => "server" in obj, get: obj => obj.server, set: (obj, value) => { obj.server = value; } }, metadata: _metadata }, _server_initializers, _server_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ChatGateway = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        chatService = __runInitializers(this, _instanceExtraInitializers);
        jwt;
        server = __runInitializers(this, _server_initializers, void 0);
        logger = (__runInitializers(this, _server_extraInitializers), new Logger(ChatGateway.name));
        // userId -> set of socket ids (a user can have multiple devices/tabs open)
        onlineUsers = new Map();
        constructor(chatService, jwt) {
            this.chatService = chatService;
            this.jwt = jwt;
        }
        async handleConnection(client) {
            try {
                const token = client.handshake.auth?.token ?? client.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token)
                    throw new Error('Missing token');
                const payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
                client.user = { userId: payload.sub, role: payload.role };
                this.addOnlineSocket(payload.sub, client.id);
                this.logger.log(`User ${payload.sub} connected (${client.id})`);
                // Auto-join a personal room so other services/gateways can push events
                // to this user by userId without tracking socket ids themselves.
                client.join(`user:${payload.sub}`);
            }
            catch (err) {
                this.logger.warn(`Rejected unauthenticated socket connection: ${err.message}`);
                client.disconnect();
            }
        }
        handleDisconnect(client) {
            if (client.user) {
                this.removeOnlineSocket(client.user.userId, client.id);
                this.logger.log(`User ${client.user.userId} disconnected (${client.id})`);
            }
        }
        async joinConversation(client, dto) {
            await this.chatService.assertParticipant(dto.conversationId, client.user.userId);
            client.join(`conversation:${dto.conversationId}`);
            return { event: 'joined_conversation', conversationId: dto.conversationId };
        }
        leaveConversation(client, dto) {
            client.leave(`conversation:${dto.conversationId}`);
        }
        async sendMessage(client, dto) {
            const userId = client.user.userId;
            const message = await this.chatService.createMessage(dto.conversationId, userId, dto.content, dto.attachmentUrl);
            // Broadcast to everyone currently in the conversation room (including sender,
            // so all of the sender's own devices/tabs stay in sync).
            this.server.to(`conversation:${dto.conversationId}`).emit('new_message', message);
            // Push a lightweight notification to participants who aren't in the room
            // right now (e.g. app in background) via their personal user:<id> room.
            const otherUserIds = await this.chatService.getOtherParticipantIds(dto.conversationId, userId);
            for (const otherId of otherUserIds) {
                this.server.to(`user:${otherId}`).emit('message_notification', {
                    conversationId: dto.conversationId,
                    from: message.sender,
                    preview: message.content ?? '📎 Attachment',
                });
            }
            return message;
        }
        typing(client, dto) {
            this.server.to(`conversation:${dto.conversationId}`).except(client.id).emit('typing', {
                conversationId: dto.conversationId,
                userId: client.user.userId,
            });
        }
        isUserOnline(userId) {
            return (this.onlineUsers.get(userId)?.size ?? 0) > 0;
        }
        // Lets other modules (e.g. notifications) push to a user without
        // needing to know their socket id — just their userId.
        emitToUser(userId, event, payload) {
            this.server.to(`user:${userId}`).emit(event, payload);
        }
        addOnlineSocket(userId, socketId) {
            if (!this.onlineUsers.has(userId))
                this.onlineUsers.set(userId, new Set());
            this.onlineUsers.get(userId).add(socketId);
        }
        removeOnlineSocket(userId, socketId) {
            this.onlineUsers.get(userId)?.delete(socketId);
            if (this.onlineUsers.get(userId)?.size === 0)
                this.onlineUsers.delete(userId);
        }
    };
    return ChatGateway = _classThis;
})();
export { ChatGateway };
