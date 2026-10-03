import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { SessionUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
@Controller()
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Get('projects/:projectId/tasks')
  list(
    @Param('projectId', new ParseUUIDPipe()) id: string,
    @Query() query: ListTasksDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tasks.list(id, user.id, query.status);
  }
  @Post('projects/:projectId/tasks')
  create(
    @Param('projectId', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tasks.create(id, user.id, dto);
  }
  @Patch('tasks/:taskId/status')
  update(
    @Param('taskId', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tasks.updateStatus(id, user.id, dto.status);
  }
}
