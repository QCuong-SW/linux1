import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { projectSummary } from '../projects/project-summary';
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}
  summary(ownerId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const totalProjects = await tx.project.count({ where: { ownerId } });
        const groups = await tx.task.groupBy({
          by: ['status'],
          where: { project: { ownerId } },
          _count: { _all: true },
        });
        const count = (status: string) =>
          groups.find((row) => row.status === status)?._count._all ?? 0;
        const recent = await tx.project.findMany({
          where: { ownerId },
          take: 3,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { _count: { select: { tasks: true } } },
        });
        const completed = await tx.task.groupBy({
          by: ['projectId'],
          where: {
            projectId: { in: recent.map((project) => project.id) },
            project: { ownerId },
            status: 'DONE',
          },
          _count: { _all: true },
        });
        const recentProjects = recent.map((project) =>
          projectSummary(
            project,
            completed.find((row) => row.projectId === project.id)?._count._all ?? 0,
          ),
        );
        const pendingTasks = await tx.task.findMany({
          where: { project: { ownerId }, status: { not: 'DONE' } },
          take: 5,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { project: { select: { id: true, name: true } } },
        });
        return {
          totalProjects,
          totalTasks: count('TODO') + count('IN_PROGRESS') + count('DONE'),
          todoTasks: count('TODO'),
          inProgressTasks: count('IN_PROGRESS'),
          completedTasks: count('DONE'),
          recentProjects,
          pendingTasks,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
