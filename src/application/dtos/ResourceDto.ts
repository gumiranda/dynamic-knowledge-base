import { ResourceType } from '../../domain/enums/ResourceType';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Objects for Resource operations
 */

/**
 * DTO for creating a new resource
 */
export class CreateResourceDto {
  @IsNotEmpty({ message: 'Topic ID is required' })
  @IsString({ message: 'Topic ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Topic ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  topicId: string;

  @IsNotEmpty({ message: 'URL is required' })
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @Transform(({ value }) => value?.trim())
  url: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  @Length(1, 500, {
    message: 'Description must be between 1 and 500 characters',
  })
  @Transform(({ value }) => value?.trim())
  description: string;

  @IsNotEmpty({ message: 'Resource type is required' })
  @IsEnum(ResourceType, {
    message: `Resource type must be one of: ${Object.values(ResourceType).join(', ')}`,
  })
  type: ResourceType;
}

/**
 * DTO for updating an existing resource
 */
export class UpdateResourceDto {
  @IsOptional()
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @Transform(({ value }) => value?.trim())
  url?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(1, 500, {
    message: 'Description must be between 1 and 500 characters',
  })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsEnum(ResourceType, {
    message: `Resource type must be one of: ${Object.values(ResourceType).join(', ')}`,
  })
  type?: ResourceType;

  @IsOptional()
  @IsString({ message: 'Topic ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Topic ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  topicId?: string;
}

/**
 * DTO for resource response
 */
export interface ResourceResponseDto {
  id: string;
  topicId: string;
  url: string;
  description: string;
  type: ResourceType;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for resource search results
 */
export interface ResourceSearchDto {
  resources: ResourceResponseDto[];
  totalCount: number;
  searchTerm?: string;
  filterType?: ResourceType;
}

/**
 * DTO for resources grouped by topic
 */
export interface TopicResourcesDto {
  topicId: string;
  topicName: string;
  resources: ResourceResponseDto[];
  resourceCount: number;
}
