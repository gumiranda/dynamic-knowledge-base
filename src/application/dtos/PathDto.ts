import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Data Transfer Objects for Path operations
 */

/**
 * DTO for finding path between topics
 */
export class FindPathDto {
  @IsNotEmpty({ message: 'Start topic ID is required' })
  @IsString({ message: 'Start topic ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Start topic ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  startId: string;

  @IsNotEmpty({ message: 'End topic ID is required' })
  @IsString({ message: 'End topic ID must be a string' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'End topic ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  endId: string;
}

/**
 * DTO for path response
 */
export interface PathResponseDto {
  startTopicId: string;
  endTopicId: string;
  path: Array<{
    id: string;
    name: string;
    step: number;
  }>;
  pathLength: number;
  pathExists: boolean;
}
