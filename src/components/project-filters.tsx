import { Button } from "@/components/ui/button";

interface ProjectFiltersProps {
  categories: string[];
  activeFilter: string;
  onFilterChange: (category: string) => void;
}

export default function ProjectFilters({
  categories,
  activeFilter,
  onFilterChange,
}: ProjectFiltersProps) {
  return (
    <div className="flex justify-center flex-wrap gap-2 mb-8">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeFilter === category ? "default" : "outline"}
          onClick={() => onFilterChange(category)}
          className="capitalize"
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
