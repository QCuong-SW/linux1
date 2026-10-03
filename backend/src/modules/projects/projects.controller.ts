import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { SessionUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}
  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.projects.list(user.id);
  }
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: SessionUser) {
    return this.projects.create(dto.name, user.id);
  }
  @Get(':projectId')
  detail(@Param('projectId', new ParseUUIDPipe()) id: string, @CurrentUser() user: SessionUser) {
    return this.projects.detail(id, user.id);
  }
}
