import projectsData from '@/data/projects.json';
import type { Project } from '@/types';

const projects: Project[] = projectsData;

export function getProjects(): Project[] {
  return projects;
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
