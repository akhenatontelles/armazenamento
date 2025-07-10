import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface FileBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
}

export const FileBreadcrumb = ({ breadcrumb, onBreadcrumbClick }: FileBreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
      {breadcrumb.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index === 0 ? (
            <Home className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <button
            onClick={() => onBreadcrumbClick(index)}
            className="hover:text-foreground transition-colors"
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
};