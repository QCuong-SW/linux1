import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { TaskStatus } from '../../database/prisma/generated/client';
import { CreateTaskDto } from './dto/create-task.dto';
@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}
  list(projectId: string, ownerId: string, status?: TaskStatus) {
    return this.prisma.task.findMany({
      where: { projectId, project: { ownerId }, status },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
  create(projectId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: { projectId, title: dto.title, description: dto.description || null },
    });
  }
  updateStatus(id: string, ownerId: string, status: TaskStatus) {
    return this.prisma.task.updateManyAndReturn({
      where: { id, project: { ownerId } },
      data: { status },
    });
  }
}
