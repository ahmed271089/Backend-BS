import { IsArray, IsOptional, IsString, MinLength, ArrayMinSize } from 'class-validator';

export class StartConversationDto {
  @IsString()
  otherUserId: string;
}

export class CreateGroupConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];
}

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class SendMessageRestDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class TypingDto {
  @IsString()
  conversationId: string;
}

export class JoinConversationDto {
  @IsString()
  conversationId: string;
}

export class SendFriendRequestDto {
  @IsString()
  @MinLength(1)
  receiverId: string;
}
