import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
@Injectable()
export class ProjectsService {
  constructor(private readonly projects: ProjectsRepository) {}
  list(ownerId: string) {
    return this.projects.list(ownerId);
  }
  create(name: string, ownerId: string) {
    return this.projects.create(name, ownerId);
  }
  async detail(id: string, ownerId: string) {
    const project = await this.projects.detail(id, ownerId);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
  async requireOwned(id: string, ownerId: string) {
    if (!(await this.projects.findOwned(id, ownerId)))
      throw new NotFoundException('Project not found');
  }
}
