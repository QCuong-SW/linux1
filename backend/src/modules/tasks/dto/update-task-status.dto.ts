import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../database/prisma/generated/client';
export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
