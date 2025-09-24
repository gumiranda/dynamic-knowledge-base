/**
 * Data Transfer Objects for Topic operations
 */

/**
 * DTO for creating a new topic
 */
export interface CreateTopicDto {
  name: string;
  content: string;
  parentTopicId?: string;
}

/**
 * DTO for updating an existing topic
 */
export interface UpdateTopicDto {
  name?: string;
  content?: string;
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
