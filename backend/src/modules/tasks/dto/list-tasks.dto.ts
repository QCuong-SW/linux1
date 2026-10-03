import { IsEnum, ValidateIf } from 'class-validator';
import { TaskStatus } from '../../../database/prisma/generated/client';
export class ListTasksDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
