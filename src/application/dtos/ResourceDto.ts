import { ResourceType } from '../../domain/enums/ResourceType';

/**
 * Data Transfer Objects for Resource operations
 */

/**
 * DTO for creating a new resource
 */
export interface CreateResourceDto {
  topicId: string;
  url: string;
  description: string;
  type: ResourceType;
}

/**
 * DTO for updating an existing resource
 */
export interface UpdateResourceDto {
  url?: string;
  description?: string;
  type?: ResourceType;
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
