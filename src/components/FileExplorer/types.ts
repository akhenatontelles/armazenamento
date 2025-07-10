export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  parentId?: string;
  createdAt: Date;
  url?: string;
  path?: string;
}

export interface FileExplorerProps {
  isAdmin: boolean;
  defaultViewMode?: "list" | "grid";
  onViewModeChange?: (mode: "list" | "grid") => void;
}

export type ViewMode = "list" | "grid";