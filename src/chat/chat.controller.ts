import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ChatService } from "./chat.service";
import {
  SendFriendRequestDto,
  StartConversationDto,
  CreateGroupConversationDto,
  SendMessageRestDto,
} from "./dto/chat.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get("conversations")
  listConversations(@CurrentUser() user: { userId: string }) {
    return this.chatService.listConversations(user.userId);
  }

  @Post("conversations")
  startConversation(
    @CurrentUser() user: { userId: string },
    @Body() dto: StartConversationDto,
  ) {
    return this.chatService.findOrCreateDirectConversation(
      user.userId,
      dto.otherUserId,
    );
  }

  @Post("conversations/group")
  createGroupConversation(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.chatService.createGroupConversation(
      user.userId,
      dto.participantIds,
    );
  }

  @Get("conversations/:id/messages")
  getMessages(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("before") before?: string,
  ) {
    return this.chatService.getMessages(id, user.userId, 50, before);
  }

  @Post("conversations/:id/messages")
  sendMessage(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: SendMessageRestDto,
  ) {
    return this.chatService.createMessage(
      id,
      user.userId,
      dto.content,
      dto.attachmentUrl,
    );
  }

  @Patch("conversations/:id/read")
  markRead(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.chatService.markRead(id, user.userId);
  }

  @Post("friend-requests")
  sendFriendRequest(
    @CurrentUser() user: { userId: string },
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.chatService.sendFriendRequest(user.userId, dto.receiverId);
  }

  @Get("friend-requests/pending")
  listPending(@CurrentUser() user: { userId: string }) {
    return this.chatService.listPendingFriendRequests(user.userId);
  }

  @Patch("friend-requests/:id/accept")
  acceptFriendRequest(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.chatService.respondFriendRequest(id, user.userId, true);
  }

  @Patch("friend-requests/:id/reject")
  rejectFriendRequest(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.chatService.respondFriendRequest(id, user.userId, false);
  }

  @Get("friends")
  listFriends(@CurrentUser() user: { userId: string }) {
    return this.chatService.listFriends(user.userId);
  }

  @Delete("friends/:friendId")
  removeFriend(
    @CurrentUser() user: { userId: string },
    @Param("friendId") friendId: string,
  ) {
    return this.chatService.removeFriend(user.userId, friendId);
  }
}
