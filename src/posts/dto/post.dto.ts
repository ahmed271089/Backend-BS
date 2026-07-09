import { ArrayMinSize, IsArray, IsEnum, IsIn, IsOptional, IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class AttachmentInputDto {
  @IsIn(['PHOTO', 'VIDEO'])
  type: 'PHOTO' | 'VIDEO';

  @IsString()
  url: string;
}

export class CreatePostDto {
  @IsEnum(['PROBLEM', 'SOLUTION'])
  type: 'PROBLEM' | 'SOLUTION';

  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsArray()
  attachments?: AttachmentInputDto[];
}

export class PreviewAnalysisDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
