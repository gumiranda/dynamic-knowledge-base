import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Common DTOs for shared validation patterns
 */

/**
 * DTO for ID parameter validation
 */
export class IdParamDto {
  @IsString({ message: 'ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  id: string;
}

/**
 * DTO for pagination parameters
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value) || 10)
  limit?: number = 10;
}

/**
 * DTO for search parameters
 */
export class SearchDto extends PaginationDto {
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @Transform(({ value }) => value?.trim())
  search?: string;
}

/**
 * DTO for version parameter validation
 */
export class VersionParamDto {
  @Type(() => Number)
  @IsInt({ message: 'Version must be an integer' })
  @Min(1, { message: 'Version must be at least 1' })
  version: number;
}

/**
 * DTO for topic hierarchy query parameters
 */
export class HierarchyQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Max depth must be an integer' })
  @Min(1, { message: 'Max depth must be at least 1' })
  @Max(10, { message: 'Max depth cannot exceed 10' })
  maxDepth?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeResources?: boolean = false;
}
