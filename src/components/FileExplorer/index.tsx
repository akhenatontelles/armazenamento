import { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/config";
import { useToast } from "@/hooks/use-toast";
import { FileExplorerProps, FileItem, ViewMode } from "./types";
import { FileBreadcrumb } from "./FileBreadcrumb";
import { FileToolbar } from "./FileToolbar";
import { FileItem as FileItemComponent } from "./FileItem";
import { FilePreviewModal } from "./FilePreviewModal";
import { RenameModal } from "./RenameModal";
import { useFileOperations } from "./useFileOperations";

const FileExplorer = ({ isAdmin, defaultViewMode = "grid", onViewModeChange }: FileExplorerProps) => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Início" }
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false); // Novo estado para controlar se a busca está ativa
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const { toast } = useToast();

  const {
    files: displayedFiles, // Renomeado para evitar conflito com 'File' type e para clareza
    isLoading: isLoadingFiles, // Estado de carregamento do hook
    fetchFilesAndFolders,
    normalizeFileType, // Ainda pode ser útil no frontend para algum processamento de tipo antes do upload, se necessário
    canPreviewFile,
    formatFileSize,
    createFolder: apiCreateFolder,
    uploadFiles: apiUploadFiles, // Upload de arquivos individuais (diálogo)
    deleteFile: apiDeleteFile,
    renameFile: apiRenameFile,
    downloadFile // Esta função do hook agora só precisa da URL que já vem do backend
  } = useFileOperations();

  // Efeito para carregar arquivos quando currentFolder muda
  useEffect(() => {
    fetchFilesAndFolders(currentFolder);
  }, [currentFolder, fetchFilesAndFolders]);


  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  // Helper function to build path for a file/folder
  const buildPathMap = (allItems: FileItem[]): Map<string, string> => {
    const pathMap = new Map<string, string>();
    const itemMap = new Map<string, FileItem>();
    allItems.forEach(item => itemMap.set(item.id, item));

    function getPath(itemId: string | null | undefined): string {
      if (!itemId) return ""; // Root items might have null parentId initially
      const item = itemMap.get(itemId);
      if (!item) return "";

      // Check if path is already computed to avoid redundant calculations (memoization)
      if (pathMap.has(itemId)) return pathMap.get(itemId)!;

      let parentPath = "";
      if (item.parentId) { // Check if parentId exists before recursing
        parentPath = getPath(item.parentId);
      }
      
      // For root items, path starts with /name, otherwise /parentPath/name
      const currentPath = parentPath ? `${parentPath}/${item.name}` : `/${item.name}`;
      pathMap.set(itemId, currentPath);
      return currentPath;
    }

    allItems.forEach(item => {
      if (!pathMap.has(item.id)) {
        getPath(item.id);
      }
    });
    return pathMap;
  };

  // Handle search
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      setIsSearchActive(true);
      setIsProcessingDrop(true); // Re-usar isLoading para busca
      const performSearch = async () => {
        try {
          const response = await fetchApi(`/files/search.php?query=${encodeURIComponent(trimmedQuery)}`);
          if (!response.ok) {
            const errData = await response.json().catch(() => ({error: "Erro na busca"}));
            throw new Error(errData.error || "Falha ao buscar arquivos.");
          }
          const resultsData: FileItem[] = await response.json();
          // O backend já deve incluir o 'path' completo nos resultados da busca
          const processedResults = resultsData.map(item => ({
            ...item,
            createdAt: new Date(item.createdAt),
          }));
          setSearchResults(processedResults);
        } catch (error) {
          const err = error as Error;
          console.error("Search API error:", err);
          toast({ title: "Erro na Busca", description: err.message, variant: "destructive" });
          setSearchResults([]);
        } finally {
          setIsProcessingDrop(false);
        }
      };
      performSearch();
    } else {
      setIsSearchActive(false);
      setSearchResults([]);
    }
  }, [searchQuery, toast]);

  const handlePreview = (file: FileItem) => {
    if (file.type === "file" && canPreviewFile(file)) {
      // file.url já é a URL de download/preview do backend
      setPreviewFile(file);
      setIsPreviewOpen(true);
    }
  };

  const handleFolderNavigation = (folderId: string | null, folderName: string) => {
    setCurrentFolder(folderId);
    const existingCrumbIndex = breadcrumb.findIndex(b => b.id === folderId);
    if (folderId === null) {
        setBreadcrumb([{ id: null, name: "Início" }]);
    } else if (existingCrumbIndex !== -1) {
      setBreadcrumb(breadcrumb.slice(0, existingCrumbIndex + 1));
    } else {
      setBreadcrumb([...breadcrumb, { id: folderId, name: folderName }]);
    }
  };

  const handleFileClick = (file: FileItem, isSearchResult: boolean = false) => {
    if (file.type === "folder") {
      if (isSearchResult) {
        setSearchQuery("");
        setIsSearchActive(false);
        setSearchResults([]);
      }
      handleFolderNavigation(file.id, file.name);
    } else {
      handlePreview(file);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setSearchQuery("");
    setIsSearchActive(false);
    setSearchResults([]);
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    setCurrentFolder(newBreadcrumb[newBreadcrumb.length - 1].id);
  };

  // CRUD operations calling the new hook functions
  const handleApiCreateFolder = async () => {
    await apiCreateFolder(newFolderName, currentFolder);
    setNewFolderName("");
    setIsCreateFolderOpen(false);
  };

  const handleApiDeleteFile = async (file: FileItem) => {
    const isCurrentFolderBeingDeleted = file.type === 'folder' && currentFolder === file.id;
    await apiDeleteFile(file, currentFolder);
    
    if (isCurrentFolderBeingDeleted) {
      const newBreadcrumb = breadcrumb.slice(0, -1);
      setBreadcrumb(newBreadcrumb);
      const parentOfDeletedFolderId = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1]?.id : null;
      setCurrentFolder(parentOfDeletedFolderId);
    }
  };

  const handleApiRenameFile = async () => {
    if (!editingFile || !editName.trim()) return;
    await apiRenameFile(editingFile.id, editName, currentFolder);
    setEditingFile(null);
    setEditName("");
    setIsEditOpen(false);
  };

  // Upload via Dialog (individual files)
  const handleDialogFileUpload = async () => {
    if (selectedFiles.length === 0) return;
    await apiUploadFiles(selectedFiles, currentFolder);
    setSelectedFiles([]);
    setIsUploadOpen(false);
  };

  const startRename = (file: FileItem) => {
    setEditingFile(file);
    setEditName(file.name);
    setIsEditOpen(true);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    // Only set isDragOver if items are being dragged (some browsers trigger dragenter on empty drags)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // This is necessary to allow a drop
    e.stopPropagation();
    // Optionally, ensure isDragOver is true if it somehow got missed by dragenter
    // However, with the counter logic, this should ideally not be needed.
    // if (!isDragOver && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
    //   setIsDragOver(true);
    // }
  };

  // Upload logic para arquivos individuais (drag-drop ou input)
  const uploadSingleFileToServer = async (file: File, targetFolderIdInDb: string | null, relativePathForBackend?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (targetFolderIdInDb) {
      formData.append('parentId', targetFolderIdInDb);
    }
    if (relativePathForBackend) {
      formData.append('webkitRelativePath', relativePathForBackend);
    }

    try {
      const response = await fetchApi('/files/upload.php', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`Error uploading ${file.name}:`, data.error);
        toast({ title: `Erro no Upload de ${file.name}`, description: data.error || "Falha no servidor.", variant: "destructive", duration: 4000 });
        return false;
      }
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Network error uploading ${file.name}:`, err);
      toast({ title: `Erro de Rede no Upload de ${file.name}`, description: err.message, variant: "destructive", duration: 4000 });
      return false;
    }
  };

  // Revised handleDrop (única versão)
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;
    if (!isAdmin) return;

    setIsProcessingDrop(true);
    let refreshNeeded = false;
    const dataTransferItems = Array.from(e.dataTransfer.items);

    for (const item of dataTransferItems) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isFile) {
            const file = item.getAsFile();
            if (file) {
              if (await uploadSingleFileToServer(file, currentFolder)) {
                refreshNeeded = true;
              }
            }
          } else if (entry.isDirectory) {
            // Upload de diretórios removido, pois agora é feito apenas via backend/hook
          }
        }
      }
    }
    setIsProcessingDrop(false);
    if (refreshNeeded) {
      fetchFilesAndFolders(currentFolder);
    }
  };

  // handleFolderInputChange já está correto, pois usa uploadSingleFileToServer
  const handleFolderInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    setIsProcessingDrop(true);
    let successCount = 0;
    const filesToUpload = Array.from(event.target.files);

    for (const file of filesToUpload) {
      // webkitRelativePath é crucial para o backend reconstruir a estrutura
      // O parentId aqui é o currentFolder na visualização do FileExplorer
      if (await uploadSingleFileToServer(file, currentFolder, file.webkitRelativePath || file.name)) {
        successCount++;
      }
    }

    setIsProcessingDrop(false);
    if (successCount > 0 || filesToUpload.length > 0) { // Refresh even if some failed but some were attempted
        if(successCount > 0) {
            toast({ title: "Upload de Pasta Concluído", description: `${successCount} de ${filesToUpload.length} arquivo(s) processado(s) com sucesso.` });
        }
      fetchFilesAndFolders(currentFolder);
    }
    if (event.target) event.target.value = ""; // Reset input
  };


  return (
    <div 
      className={`space-y-4 relative ${isDragOver && isAdmin ? 'bg-primary/10 border-2 border-dashed border-primary rounded-lg p-4' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isProcessingDrop && (
        <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center z-50 rounded-lg">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-semibold text-primary">Processando arquivos...</p>
          <p className="text-sm text-muted-foreground">Por favor, aguarde.</p>
        </div>
      )}
      <FileBreadcrumb 
        breadcrumb={breadcrumb}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      <FileToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isAdmin={isAdmin}
        isCreateFolderOpen={isCreateFolderOpen}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        isUploadOpen={isUploadOpen}
        setIsUploadOpen={setIsUploadOpen}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        onCreateFolder={handleApiCreateFolder} // Use new handler
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        onFileUpload={handleDialogFileUpload} // Use new handler for dialog file uploads
        onFolderInputChange={handleFolderInputChange}
      />

      {isDragOver && isAdmin && (
        <div className="text-center py-8 text-primary">
          <p className="text-lg font-medium">Solte arquivos ou pastas aqui para fazer upload</p>
        </div>
      )}

      {/* Search Results or Files Grid/List */}
      {isSearchActive ? (
        searchResults.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Resultados da busca ({searchResults.length})</h3>
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-1"}>
              {searchResults.map((file) => (
                <FileItemComponent
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  isAdmin={isAdmin}
                  formatFileSize={formatFileSize}
                  onFileClick={(item) => handleFileClick(item, true)}
                  onDownload={downloadFile} // downloadFile from hook
                  onRename={startRename}     // startRename sets state for modal
                  onDelete={handleApiDeleteFile} // Use new handler
                  isSearchResult={true}
                />
              ))}
            </div>
          </div>
        ) : (
          searchQuery ? // Only show "no results" if a search was actually made
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum arquivo encontrado para "{searchQuery}"</p>
            </div>
          : null // Don't show "no results" if search query is empty and not active
        )
      ) :
      isLoadingFiles ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
          Carregando arquivos...
        </div>
      ) :
      (
        // Display current folder's files if search is not active and not loading
        displayedFiles.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-1"}>
            {displayedFiles.map((file) => (
              <FileItemComponent
                key={file.id}
                file={file}
                viewMode={viewMode}
                isAdmin={isAdmin}
                formatFileSize={formatFileSize}
                onFileClick={(item) => handleFileClick(item, false)}
                onDownload={downloadFile} // downloadFile from hook
                onRename={startRename}     // startRename sets state for modal
                onDelete={handleApiDeleteFile} // Use new handler
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum arquivo encontrado nesta pasta</p>
          </div>
        )
      )}

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
        onRename={handleApiRenameFile} // Use new handler
      />
    </div>
  );
};

export default FileExplorer;