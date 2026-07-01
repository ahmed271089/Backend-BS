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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
let ChatService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ChatService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ChatService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        // ----------------------- Conversations -----------------------
        async findOrCreateDirectConversation(userId, otherUserId) {
            if (userId === otherUserId) {
                throw new BadRequestException('Cannot start a conversation with yourself');
            }
            // Look for an existing 1:1 (non-group) conversation between exactly these two users.
            const existing = await this.prisma.conversation.findFirst({
                where: {
                    isGroup: false,
                    participants: { some: { userId } },
                    AND: [{ participants: { some: { userId: otherUserId } } }],
                },
                include: { participants: true },
            });
            const exactMatch = existing && existing.participants.length === 2 ? existing : null;
            if (exactMatch)
                return exactMatch;
            return this.prisma.conversation.create({
                data: {
                    isGroup: false,
                    participants: {
                        create: [{ userId }, { userId: otherUserId }],
                    },
                },
                include: { participants: true },
            });
        }
        async listConversations(userId) {
            const conversations = await this.prisma.conversation.findMany({
                where: { participants: { some: { userId } } },
                include: {
                    participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
                orderBy: { createdAt: 'desc' },
            });
            return conversations.map((c) => ({
                id: c.id,
                isGroup: c.isGroup,
                otherParticipants: c.participants.filter((p) => p.userId !== userId).map((p) => p.user),
                lastMessage: c.messages[0] ?? null,
            }));
        }
        async assertParticipant(conversationId, userId) {
            const participant = await this.prisma.conversationParticipant.findUnique({
                where: { conversationId_userId: { conversationId, userId } },
            });
            if (!participant)
                throw new ForbiddenException('You are not part of this conversation');
        }
        async getMessages(conversationId, userId, take = 50, before) {
            await this.assertParticipant(conversationId, userId);
            return this.prisma.message.findMany({
                where: { conversationId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
                orderBy: { createdAt: 'desc' },
                take,
                include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
            });
        }
        async createMessage(conversationId, senderId, content, attachmentUrl) {
            await this.assertParticipant(conversationId, senderId);
            if (!content && !attachmentUrl) {
                throw new BadRequestException('Message must have content or an attachment');
            }
            return this.prisma.message.create({
                data: { conversationId, senderId, content, attachmentUrl },
                include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
            });
        }
        async markRead(conversationId, userId) {
            await this.assertParticipant(conversationId, userId);
            return this.prisma.message.updateMany({
                where: { conversationId, senderId: { not: userId }, readAt: null },
                data: { readAt: new Date() },
            });
        }
        async getOtherParticipantIds(conversationId, excludingUserId) {
            const participants = await this.prisma.conversationParticipant.findMany({
                where: { conversationId, userId: { not: excludingUserId } },
                select: { userId: true },
            });
            return participants.map((p) => p.userId);
        }
        // ----------------------- Friend requests -----------------------
        async sendFriendRequest(senderId, receiverId) {
            if (senderId === receiverId) {
                throw new BadRequestException('Cannot send a friend request to yourself');
            }
            const existing = await this.prisma.friendRequest.findFirst({
                where: {
                    OR: [
                        { senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId },
                    ],
                },
            });
            if (existing)
                throw new BadRequestException('A friend request already exists between these users');
            return this.prisma.friendRequest.create({ data: { senderId, receiverId } });
        }
        async respondFriendRequest(requestId, userId, accept) {
            const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
            if (!request)
                throw new NotFoundException('Friend request not found');
            if (request.receiverId !== userId)
                throw new ForbiddenException('Not your friend request to respond to');
            return this.prisma.friendRequest.update({
                where: { id: requestId },
                data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
            });
        }
        async listPendingFriendRequests(userId) {
            return this.prisma.friendRequest.findMany({
                where: { receiverId: userId, status: 'PENDING' },
                include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
                orderBy: { createdAt: 'desc' },
            });
        }
        async listFriends(userId) {
            const accepted = await this.prisma.friendRequest.findMany({
                where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
                include: {
                    sender: { select: { id: true, name: true, avatarUrl: true } },
                    receiver: { select: { id: true, name: true, avatarUrl: true } },
                },
            });
            return accepted.map((f) => (f.senderId === userId ? f.receiver : f.sender));
        }
    };
    return ChatService = _classThis;
})();
export { ChatService };
