import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Grid3X3, List, Plus, FolderUp } from "lucide-react"; // Added FolderUp
import { ViewMode } from "./types";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { FileUploadDialog } from "./FileUploadDialog";

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isAdmin: boolean;
  isCreateFolderOpen: boolean;
  setIsCreateFolderOpen: (open: boolean) => void;
  isUploadOpen: boolean;
  setIsUploadOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: () => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  onFileUpload: () => void;
  onFolderInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void; // New prop
}

export const FileToolbar = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  isAdmin,
  isCreateFolderOpen,
  setIsCreateFolderOpen,
  isUploadOpen,
  setIsUploadOpen,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
  selectedFiles,
  setSelectedFiles,
  onFileUpload,
  onFolderInputChange // New prop
}: FileToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-2 flex-1">
        <Input
          placeholder="Buscar arquivos globalmente..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mega-input max-w-sm text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="rounded-none"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className="rounded-none"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>

        {isAdmin && (
          <>
            <CreateFolderDialog
              isOpen={isCreateFolderOpen}
              onOpenChange={setIsCreateFolderOpen}
              folderName={newFolderName}
              onFolderNameChange={setNewFolderName}
              onCreateFolder={onCreateFolder}
            />

            <FileUploadDialog
              isOpen={isUploadOpen}
              onOpenChange={setIsUploadOpen}
              selectedFiles={selectedFiles}
              onSelectedFilesChange={setSelectedFiles}
              onFileUpload={onFileUpload}
            />

            {/* Button and hidden input for folder upload */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => document.getElementById('folder-upload-input')?.click()}
              title="Fazer upload de uma pasta"
            >
              <FolderUp className="w-4 h-4 mr-2" />
              <span>Upload Pasta</span>
            </Button>
            <input
              type="file"
              id="folder-upload-input"
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={onFolderInputChange}
            />
          </>
        )}
      </div>
    </div>
  );
};