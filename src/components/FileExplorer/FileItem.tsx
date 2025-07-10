import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator
} from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Added Sub components
import { Eye, Download, FileText, Trash2, MoreVertical, Link as LinkIcon, Share2, MessageCircle, Mail } from "lucide-react"; // Added LinkIcon, Share2, MessageCircle, Mail
import { FileItem as FileItemType, ViewMode } from "./types";
import { FileIcon } from "./FileIcon";
import { useToast } from "@/hooks/use-toast"; // For clipboard feedback

interface FileItemProps {
  file: FileItemType;
  viewMode: ViewMode;
  isAdmin: boolean;
  formatFileSize: (bytes: number) => string;
  onFileClick: (file: FileItemType) => void;
  onDownload: (file: FileItemType) => void;
  onRename: (file: FileItemType) => void;
  onDelete: (file: FileItemType) => void;
  isSearchResult?: boolean; // Optional prop
}

export const FileItem = ({
  file,
  viewMode,
  isAdmin,
  formatFileSize,
  onFileClick,
  onDownload,
  onRename,
  onDelete,
  isSearchResult = false // Default to false
}: FileItemProps) => {
  const { toast } = useToast();

  const handleShareViaLink = () => {
    navigator.clipboard.writeText(file.name)
      .then(() => {
        toast({ title: "Nome do arquivo copiado!", description: `${file.name} copiado para a área de transferência. Links diretos para arquivos locais não são compartilháveis externamente.`, duration: 4000 });
      })
      .catch(err => {
        console.error('Failed to copy file name: ', err);
        toast({ title: "Erro", description: "Não foi possível copiar o nome do arquivo.", variant: "destructive", duration: 3000 });
      });
  };

  const handleShareViaWhatsApp = () => {
    const textToShare = `Estou compartilhando este arquivo com você: ${file.name}\n\n(Observação: Este é um arquivo local. Para recebê-lo, você precisará que eu o envie diretamente.)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(textToShare)}`, '_blank');
  };

  const handleShareViaEmail = () => {
    const subject = `Arquivo Compartilhado: ${file.name}`;
    const body = `Olá,\n\nEstou compartilhando o arquivo '${file.name}' com você.\n\n(Observação: Este é um arquivo local. Para recebê-lo, você precisará que eu o envie diretamente.)`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleItemClick = (e: React.MouseEvent) => {
    // Stop propagation if the click is on the action menu button itself
    // to prevent the item click while trying to open the menu.
    if ((e.target as HTMLElement).closest('button[aria-haspopup="true"]')) {
      return;
    }
    onFileClick(file);
  };

  const ActionMenu = ({ className = "" }: { className?: string }) => (
    <DropdownMenu modal={false}> {/* Set modal to false for dropdowns inside clickable items */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 border border-border rounded bg-background ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border border-border z-50">
        <DropdownMenuItem onClick={() => onFileClick(file)}>
          <Eye className="w-4 h-4 mr-2" />
          {file.type === "folder" ? "Abrir pasta" : "Visualizar"}
        </DropdownMenuItem>
        {file.type === "file" && (
          <DropdownMenuItem onClick={() => onDownload(file)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </DropdownMenuItem>
        )}
        {file.type === "file" && ( // Share options only for files
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-popover border-border">
              <DropdownMenuItem onClick={handleShareViaLink}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copiar Nome (Link Placeholder)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareViaWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-2" /> {/* Using MessageCircle for WhatsApp */}
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareViaEmail}>
                <Mail className="w-4 h-4 mr-2" />
                E-mail
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRename(file)}>
              <FileText className="w-4 h-4 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(file)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ContextMenuItems = () => (
    <ContextMenuContent className="w-48 bg-popover border border-border">
      <ContextMenuItem onClick={() => onFileClick(file)}>
        <Eye className="w-4 h-4 mr-2" />
        {file.type === "folder" ? "Abrir pasta" : "Visualizar"}
      </ContextMenuItem>
      {file.type === "file" && (
        <>
          <ContextMenuItem onClick={() => onDownload(file)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </ContextMenuItem>
          {/* Share SubMenu in ContextMenu */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48 bg-popover border-border">
              <ContextMenuItem onClick={handleShareViaLink}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copiar Nome (Link Placeholder)
              </ContextMenuItem>
              <ContextMenuItem onClick={handleShareViaWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </ContextMenuItem>
              <ContextMenuItem onClick={handleShareViaEmail}>
                <Mail className="w-4 h-4 mr-2" />
                E-mail
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </>
      )}
      {isAdmin && (
        <>
          {/* Separator for admin actions if file actions were present */}
          {file.type === "file" && <ContextMenuSeparator />}
          <ContextMenuItem onClick={() => onRename(file)}>
            <FileText className="w-4 h-4 mr-2" />
            Renomear
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => onDelete(file)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={!isAdmin && file.type === 'folder' && !isSearchResult}>
        {/* ContextMenuTrigger might interfere with onClick, so ensure proper event handling or structure.
            For simplicity, we assume direct click on div should work.
            The disabled prop above is an example if needed, but might not be necessary with correct propagation stopping.
         */}
        <div
          className="group relative mega-file-item"
          onClick={handleItemClick} // Use the new handler for primary click
          // onContextMenu={(e) => e.stopPropagation()} // Optional: if ContextMenuTrigger handles this itself.
        >
          {viewMode === "grid" ? (
            // Grid View
            <div className="flex flex-col items-center justify-between p-3 text-center h-full w-full aspect-[4/5] overflow-hidden">
              <div className="w-full pt-2"> {/* Added pt-2 for a bit of top padding for icon */}
                {/* Container for icon - increased size */}
                <div className="mb-2 flex justify-center items-center h-20 w-20 mx-auto">
                  <FileIcon file={file} isGrid={true} />
                </div>
                {/* Container for name - fixed height to allow for 2 lines before truncation (visual) */}
                <p
                  className="text-sm font-medium w-full break-all px-1 h-10 line-clamp-2 flex items-center justify-center"
                  title={file.name}
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {file.name}
                </p>
              </div>
              
              {/* Info (size/path) - kept at the bottom */}
              <div className="w-full mt-auto pb-1 px-1"> {/* mt-auto to push to bottom, pb-1 for spacing */}
                {isSearchResult && file.path ? (
                  <p className="text-xs text-muted-foreground truncate w-full" title={file.path}>{file.path}</p>
                ) : (
                  file.type === "file" && file.size != null ? (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  ) : (
                     // For folders, keep the space to maintain alignment with files that show size
                     <p className="text-xs text-muted-foreground">&nbsp;</p>
                  )
                )}
              </div>
              <ActionMenu className="absolute top-1 right-1" />
            </div>
          ) : (
            // List View
            <div className="flex items-center gap-3 p-2">
              <div className="file-icon">
                <FileIcon file={file} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                {isSearchResult && file.path ? (
                  <p className="text-xs text-muted-foreground truncate" title={file.path}>{file.path}</p>
                ) : (
                  file.type === "file" && file.size != null && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  )
                )}
              </div>
              <div className="text-xs text-muted-foreground hidden md:block"> {/* Hide date on smaller screens for space */}
                {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}
              </div>
              {/* ActionMenu is part of the flex row, clicks on it are handled by its own trigger */}
              <ActionMenu />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuItems />
    </ContextMenu>
  );
};