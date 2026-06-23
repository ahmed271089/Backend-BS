import { ArrayMinSize, IsArray, IsEnum, IsIn, IsString, MinLength } from 'class-validator';

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

  @IsArray()
  @ArrayMinSize(1)
  attachments: AttachmentInputDto[];
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  parentId?: string;
}
