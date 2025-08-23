import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProjects, getProjectBySlug } from '@/lib/projects';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/header';
import CaseStudyGenerator from './case-study-generator';

export async function generateStaticParams() {
  const projects = getProjects();
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

interface ProjectPageProps {
  params: {
    slug: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const project = getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft size={16} />
              Back to All Projects
            </Link>
        </div>
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3">
            <h1 className="text-4xl lg:text-5xl font-bold font-headline mb-4">{project.title}</h1>
            <div className="flex items-center gap-4 mb-6">
              <Badge variant="default" className="text-sm capitalize">{project.category}</Badge>
              {project.technologies && (
                 <div className="flex flex-wrap gap-2">
                  {project.technologies.map(tech => (
                    <Badge key={tech} variant="outline">{tech}</Badge>
                  ))}
                </div>
              )}
            </div>
             <div className="aspect-video overflow-hidden rounded-lg border mb-8 shadow-md">
              <Image
                src={project.image}
                alt={project.title}
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                data-ai-hint="tech design"
              />
            </div>
            <div className="text-lg text-foreground/90 leading-relaxed space-y-6">
                <p>{project.longDescription}</p>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <CaseStudyGenerator project={project} />
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Studio Portfolio. All rights reserved.</p>
      </footer>
    </div>
  );
}
