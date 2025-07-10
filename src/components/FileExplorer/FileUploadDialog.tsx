import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FileUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: File[];
  onSelectedFilesChange: (files: File[]) => void;
  onFileUpload: () => void;
}

export const FileUploadDialog = ({
  isOpen,
  onOpenChange,
  selectedFiles,
  onSelectedFilesChange,
  onFileUpload
}: FileUploadDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="mega-button-primary">
          📤 Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Arquivos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Selecionar arquivos</Label>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => onSelectedFilesChange(Array.from(e.target.files || []))}
              className="mega-input"
            />
          </div>
          {selectedFiles.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
              <Button onClick={onFileUpload} className="mega-button-primary w-full">
                Enviar Arquivos
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};