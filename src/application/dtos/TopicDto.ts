import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Objects for Topic operations
 */

/**
 * DTO for creating a new topic
 */
export class CreateTopicDto {
  @IsNotEmpty({ message: 'Topic name is required' })
  @IsString({ message: 'Topic name must be a string' })
  @Length(1, 200, {
    message: 'Topic name must be between 1 and 200 characters',
  })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty({ message: 'Topic content is required' })
  @IsString({ message: 'Topic content must be a string' })
  @Length(1, 10000, {
    message: 'Topic content must be between 1 and 10000 characters',
  })
  @Transform(({ value }) => value?.trim())
  content: string;

  @IsOptional()
  @IsString({ message: 'Parent topic ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Parent topic ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  parentTopicId?: string;
}

/**
 * DTO for updating an existing topic
 */
export class UpdateTopicDto {
  @IsOptional()
  @IsString({ message: 'Topic name must be a string' })
  @Length(1, 200, {
    message: 'Topic name must be between 1 and 200 characters',
  })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString({ message: 'Topic content must be a string' })
  @Length(1, 10000, {
    message: 'Topic content must be between 1 and 10000 characters',
  })
  @Transform(({ value }) => value?.trim())
  content?: string;

  @IsOptional()
  @IsString({ message: 'Parent topic ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Parent topic ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  parentTopicId?: string;
}

/**
 * DTO for topic response with hierarchy information
 */
export interface TopicResponseDto {
  id: string;
  name: string;
  content: string;
  version: number;
  parentTopicId?: string;
  createdAt: Date;
  updatedAt: Date;
  childCount?: number;
  isRoot?: boolean;
  isLeaf?: boolean;
}

/**
 * DTO for topic hierarchy response
 */
export interface TopicHierarchyDto {
  topic: TopicResponseDto;
  children: TopicHierarchyDto[];
  depth: number;
}

/**
 * DTO for topic version information
 */
export interface TopicVersionDto {
  id: string;
  name: string;
  content: string;
  version: number;
  parentTopicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for topic search results
 */
export interface TopicSearchDto {
  topics: TopicResponseDto[];
  totalCount: number;
  searchTerm: string;
}
