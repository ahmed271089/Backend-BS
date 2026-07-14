import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) { }

  // ----------------------- Conversations -----------------------

  async findOrCreateDirectConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException(
        "Cannot start a conversation with yourself",
      );
    }

    const isFriend = await this.areFriends(userId, otherUserId);
    if (!isFriend) {
      throw new ForbiddenException("You must be friends to chat");
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

    const exactMatch =
      existing && existing.participants.length === 2 ? existing : null;
    if (exactMatch) return exactMatch;

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

  async createGroupConversation(userId: string, participantIds: string[]) {
    // Ensure uniqueness and that the creator is included
    const allParticipantIds = Array.from(new Set([userId, ...participantIds]));

    if (allParticipantIds.length < 2) {
      throw new BadRequestException(
        "A group conversation must have at least 2 participants including yourself",
      );
    }

    // Ensure creator is friends with everyone else
    for (const pId of participantIds) {
      if (pId !== userId) {
        const isFriend = await this.areFriends(userId, pId);
        if (!isFriend) {
          throw new ForbiddenException("You can only add friends to a group chat");
        }
      }
    }

    return this.prisma.conversation.create({
      data: {
        isGroup: true,
        participants: {
          create: allParticipantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async listConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return conversations.map((c) => ({
      id: c.id,
      isGroup: c.isGroup,
      otherParticipants: c.participants
        .filter((p) => p.userId !== userId)
        .map((p) => p.user),
      lastMessage: c.messages[0] ?? null,
    }));
  }

  async deleteConversation(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    
    // We just delete the whole conversation for simplicity in this MVP
    // A more advanced system would just remove the participant
    return this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant)
      throw new ForbiddenException("You are not part of this conversation");
  }

  async getMessages(
    conversationId: string,
    userId: string,
    take = 50,
    before?: string,
  ) {
    await this.assertParticipant(conversationId, userId);

    return this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content?: string,
    attachmentUrl?: string,
  ) {
    await this.assertParticipant(conversationId, senderId);
    if (!content && !attachmentUrl) {
      throw new BadRequestException(
        "Message must have content or an attachment",
      );
    }

    // In a real application, you might want to verify friendship still exists,
    // especially for direct messages. We'll add a check for direct messages.
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    
    if (conversation && !conversation.isGroup && conversation.participants.length === 2) {
      const otherParticipant = conversation.participants.find(p => p.userId !== senderId);
      if (otherParticipant) {
        const isFriend = await this.areFriends(senderId, otherParticipant.userId);
        if (!isFriend) {
          throw new ForbiddenException("You must be friends to send messages in this conversation");
        }
      }
    }

    return this.prisma.message.create({
      data: { conversationId, senderId, content, attachmentUrl },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getOtherParticipantIds(
    conversationId: string,
    excludingUserId: string,
  ) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: excludingUserId } },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }

  // ----------------------- Friend requests -----------------------

  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException("Cannot send a friend request to yourself");
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
      throw new BadRequestException(
        "A friend request already exists between these users",
      );

    const request = await this.prisma.friendRequest.create({
      data: { senderId, receiverId },
    });

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, name: true },
    });
    await this.notificationsService.create(receiverId, "FRIEND_REQUEST", {
      requestId: request.id,
      senderId,
      senderName: sender?.name ?? "Someone",
    });

    return request;
  }

  async respondFriendRequest(
    requestId: string,
    userId: string,
    accept: boolean,
  ) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("Friend request not found");
    if (request.receiverId !== userId)
      throw new ForbiddenException("Not your friend request to respond to");

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: accept ? "ACCEPTED" : "REJECTED" },
    });
  }

  async listPendingFriendRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listFriends(userId: string) {
    const accepted = await this.prisma.friendRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return accepted.map((f) => (f.senderId === userId ? f.receiver : f.sender));
  }

  async removeFriend(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException("Cannot unfriend yourself");
    }

    // Find the accepted friend request between these two users
    const friendRequest = await this.prisma.friendRequest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!friendRequest) {
      throw new NotFoundException("Friend relationship not found");
    }

    // Delete the friend request to remove the friendship
    await this.prisma.friendRequest.delete({
      where: { id: friendRequest.id },
    });

    return { message: "Friend removed successfully" };
  }

  async areFriends(userId1: string, userId2: string) {
    const friendRequest = await this.prisma.friendRequest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
    });
    return !!friendRequest;
  }
}
