import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import type { TaskStatus } from '../../database/prisma/generated/client';
@Injectable()
export class TasksService {
  constructor(
    private readonly tasks: TasksRepository,
    private readonly projects: ProjectsService,
  ) {}
  async list(projectId: string, ownerId: string, status?: TaskStatus) {
    await this.projects.requireOwned(projectId, ownerId);
    return this.tasks.list(projectId, ownerId, status);
  }
  async create(projectId: string, ownerId: string, dto: CreateTaskDto) {
    await this.projects.requireOwned(projectId, ownerId);
    return this.tasks.create(projectId, dto);
  }
  async updateStatus(id: string, ownerId: string, status: TaskStatus) {
    const [task] = await this.tasks.updateStatus(id, ownerId, status);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
