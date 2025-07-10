import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileItem } from "./types";

interface RenameModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  editName: string;
  onEditNameChange: (name: string) => void;
  onRename: () => void;
}

export const RenameModal = ({
  isOpen,
  onOpenChange,
  file,
  editName,
  onEditNameChange,
  onRename
}: RenameModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear {file?.type === 'folder' ? 'Pasta' : 'Arquivo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Novo nome</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="mega-input"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onRename} className="mega-button-primary flex-1">
              Renomear
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};