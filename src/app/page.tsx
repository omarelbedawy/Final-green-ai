'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/header';
import ProjectCard from '@/components/project-card';
import ProjectFilters from '@/components/project-filters';
import { getProjects } from '@/lib/projects';

const allProjects = getProjects();
const categories = ['All', ...Array.from(new Set(allProjects.map((p) => p.category)))];

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'All') {
      return allProjects;
    }
    return allProjects.filter((project) => project.category === activeFilter);
  }, [activeFilter]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 font-headline">Our Work</h1>
            <p className="text-center text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our portfolio of creative projects, from stunning web designs to memorable branding.
            </p>
        </div>
        
        <ProjectFilters
          categories={categories}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Studio Portfolio. All rights reserved.</p>
      </footer>
    </div>
  );
}
