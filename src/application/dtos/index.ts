// User DTOs
export {
  RegisterUserDto,
  UpdateUserDto,
  AuthenticateUserDto,
  UserResponseDto,
  UserSearchDto,
  AssignRoleDto,
  UserStatsDto,
} from './UserDto';

// Topic DTOs
export {
  CreateTopicDto,
  UpdateTopicDto,
  TopicResponseDto,
  TopicHierarchyDto,
  TopicVersionDto,
  TopicSearchDto,
} from './TopicDto';

// Resource DTOs
export {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceResponseDto,
  ResourceSearchDto,
  TopicResourcesDto,
} from './ResourceDto';

// Path DTOs
export { FindPathDto, PathResponseDto } from './PathDto';

// Common DTOs
export {
  IdParamDto,
  PaginationDto,
  SearchDto,
  VersionParamDto,
  HierarchyQueryDto,
} from './CommonDto';

// Legacy validation schemas (for backward compatibility)
export { ValidationSchemas } from './ValidationSchemas';
