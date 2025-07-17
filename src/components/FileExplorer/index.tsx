import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { FileExplorerProps, FileItem, ViewMode } from "./types";
import { FileBreadcrumb } from "./FileBreadcrumb";
import { FileToolbar } from "./FileToolbar";
import { FileItem as FileItemComponent } from "./FileItem";
import { FilePreviewModal } from "./FilePreviewModal";
import { RenameModal } from "./RenameModal";
import { useFileOperations } from "./useFileOperations";

const FileExplorer = ({ isAdmin, defaultViewMode = "grid" }: FileExplorerProps) => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Início" }
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);

  const { toast } = useToast();
  const {
    files,
    isLoading,
    fetchFilesAndFolders,
    uploadFiles,
    createFolder,
    deleteFile,
    renameFile,
    downloadFile,
    canPreviewFile,
    formatFileSize
  } = useFileOperations();

  useEffect(() => {
    fetchFilesAndFolders(currentFolder);
  }, [currentFolder, fetchFilesAndFolders]);

  const handleFolderNavigation = useCallback((folderId: string | null, folderName: string) => {
    setCurrentFolder(folderId);
    if (folderId === null) {
      setBreadcrumb([{ id: null, name: "Início" }]);
    } else {
      const crumbIndex = breadcrumb.findIndex(c => c.id === folderId);
      if (crumbIndex > -1) {
        setBreadcrumb(breadcrumb.slice(0, crumbIndex + 1));
      } else {
        setBreadcrumb(prev => [...prev, { id: folderId, name: folderName }]);
      }
    }
  }, [breadcrumb]);

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      handleFolderNavigation(file.id, file.name);
    } else {
      if (canPreviewFile(file)) {
        setPreviewFile(file);
        setIsPreviewOpen(true);
      } else {
        toast({ title: "Preview não disponível", description: "Não é possível pré-visualizar este tipo de arquivo." });
      }
    }
  };

  const handleDialogFileUpload = async () => {
    await uploadFiles(selectedFiles, currentFolder);
    setSelectedFiles([]);
    setIsUploadOpen(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!isAdmin || !e.dataTransfer.files) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles, currentFolder);
    }
  }, [isAdmin, currentFolder, uploadFiles]);

  return (
    <div
      className={`space-y-4 relative ${isDragOver && isAdmin ? 'bg-primary/10' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}

      <FileBreadcrumb
        breadcrumb={breadcrumb}
        onBreadcrumbClick={(index) => handleFolderNavigation(breadcrumb[index].id, breadcrumb[index].name)}
      />

      <FileToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isAdmin={isAdmin}
        isCreateFolderOpen={isCreateFolderOpen}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        isUploadOpen={isUploadOpen}
        setIsUploadOpen={setIsUploadOpen}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        onCreateFolder={() => createFolder(newFolderName, currentFolder).then(() => setNewFolderName(""))}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        onFileUpload={handleDialogFileUpload}
        onFolderInputChange={() => {}}
      />

      <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-1"}>
        {files.map((file) => (
          <FileItemComponent
            key={file.id}
            file={file}
            viewMode={viewMode}
            isAdmin={isAdmin}
            formatFileSize={formatFileSize}
            onFileClick={handleFileClick}
            onDownload={downloadFile}
            onRename={(file) => { setEditingFile(file); setEditName(file.name); setIsEditOpen(true); }}
            onDelete={(file) => deleteFile(file, currentFolder)}
          />
        ))}
      </div>

      <FilePreviewModal
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        file={previewFile}
        onDownload={downloadFile}
        canPreviewFile={canPreviewFile}
      />

      <RenameModal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        file={editingFile}
        editName={editName}
        onEditNameChange={setEditName}
        onRename={() => renameFile(editingFile!.id, editName, currentFolder).then(() => setIsEditOpen(false))}
      />
    </div>
  );
};

export default FileExplorer;