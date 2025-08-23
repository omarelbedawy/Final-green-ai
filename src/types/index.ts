export interface Project {
  id: number;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  image: string;
  category: 'Web Design' | 'Graphic Design' | 'Branding';
  technologies?: string[];
}
