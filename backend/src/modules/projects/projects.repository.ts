import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { projectSummary } from './project-summary';
@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(ownerId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const projects = await tx.project.findMany({
          where: { ownerId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { _count: { select: { tasks: true } } },
        });
        const completed = await tx.task.groupBy({
          by: ['projectId'],
          where: { project: { ownerId }, status: 'DONE' },
          _count: { _all: true },
        });
        const counts = new Map(completed.map((row) => [row.projectId, row._count._all]));
        return projects.map((project) => projectSummary(project, counts.get(project.id) ?? 0));
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async detail(id: string, ownerId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const project = await tx.project.findFirst({
          where: { id, ownerId },
          include: { _count: { select: { tasks: true } } },
        });
        if (!project) return null;
        const counts = await tx.task.groupBy({
          by: ['status'],
          where: { projectId: id, project: { ownerId } },
          _count: { _all: true },
        });
        const count = (status: string) =>
          counts.find((row) => row.status === status)?._count._all ?? 0;
        return {
          ...projectSummary(project, count('DONE')),
          todoTasks: count('TODO'),
          inProgressTasks: count('IN_PROGRESS'),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  findOwned(id: string, ownerId: string) {
    return this.prisma.project.findFirst({ where: { id, ownerId }, select: { id: true } });
  }
  async create(name: string, ownerId: string) {
    const project = await this.prisma.project.create({
      data: { name, ownerId },
      include: { _count: { select: { tasks: true } } },
    });
    return projectSummary(project, 0);
  }
}
