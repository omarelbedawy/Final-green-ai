import Link from 'next/link';
import { Layers3 } from 'lucide-react';

export default function Header() {
  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
            <Layers3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight font-headline">Studio Portfolio</span>
        </Link>
      </div>
    </header>
  );
}
