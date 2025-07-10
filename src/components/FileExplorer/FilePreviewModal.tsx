import { useState, useEffect } from "react"; // Added useState, useEffect
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react"; // Removed FileText, FileSpreadsheet as they are not directly used here
import { FileItem } from "./types";
import { FileIcon } from "./FileIcon";

interface FilePreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onDownload: (file: FileItem) => void;
  canPreviewFile: (file: FileItem) => boolean;
}

export const FilePreviewModal = ({
  isOpen,
  onOpenChange,
  file,
  onDownload,
  canPreviewFile
}: FilePreviewModalProps) => {
  const [txtContent, setTxtContent] = useState<string | null>(null);
  const [txtError, setTxtError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file && file.mimeType === "text/plain" && file.url) {
      setTxtContent(null); // Reset previous content
      setTxtError(null);   // Reset previous error
      fetch(file.url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(text => setTxtContent(text))
        .catch(error => {
          console.error("Error fetching TXT content:", error);
          setTxtError("Não foi possível carregar o conteúdo do arquivo de texto.");
        });
    }
  }, [isOpen, file]); // Rerun when modal opens or file changes

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"> {/* Changed overflow-auto to overflow-y-auto for clarity */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate">
            <FileIcon file={file} />
            {file.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {file.mimeType?.includes("pdf") && (
            <div className="w-full h-[600px]">
              <iframe
                src={file.url}
                className="w-full h-full border border-border rounded"
                title={file.name}
              />
            </div>
          )}

          {file.mimeType === "text/plain" && (
            <div className="w-full h-auto max-h-[600px] overflow-y-auto p-4 my-4 border border-border rounded bg-muted/20">
              {txtError && <p className="text-destructive">{txtError}</p>}
              {txtContent === null && !txtError && <p className="text-muted-foreground">Carregando texto...</p>}
              {txtContent !== null && (
                <pre className="text-sm whitespace-pre-wrap break-all text-foreground">
                  {txtContent}
                </pre>
              )}
            </div>
          )}

          {file.mimeType?.includes("word") && (
            <div>
              <div className="w-full h-[600px] mb-4">
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url || '')}`}
                  className="w-full h-full border border-border rounded"
                  title={file.name}
                  onError={() => console.warn("Error loading Office viewer.")} // Basic error handling
                />
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() => onDownload(file)}
                  variant="outline"
                  className="mega-button-secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Se a visualização falhar, baixe o arquivo
                </Button>
              </div>
            </div>
          )}

          {(file.mimeType?.includes("excel") || file.mimeType?.includes("spreadsheet")) && (
            <div className="w-full h-[600px]">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url || '')}`}
                className="w-full h-full border border-border rounded"
                title={file.name}
              />
            </div>
          )}

          {file.mimeType?.startsWith("image/") && (
            // Removed max-h-[600px] and overflow-auto from this div.
            // The DialogContent's max-h-[90vh] and overflow-auto will handle scrolling for large images.
            <div className="flex items-center justify-center py-4">
              <img
                src={file.url}
                alt={file.name}
                // max-w-full ensures it doesn't exceed modal width.
                // h-auto maintains aspect ratio.
                // object-contain is good for ensuring the whole image is visible.
                // Removed max-h from img directly to let it grow and rely on DialogContent scroll.
                className="max-w-full h-auto object-contain rounded shadow-md"
              />
            </div>
          )}

          {file && !canPreviewFile(file) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Este tipo de arquivo não pode ser visualizado no navegador.
              </p>
              <Button 
                onClick={() => onDownload(file)}
                className="mega-button-primary"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};