import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onCreateFolder: () => void;
}

export const CreateFolderDialog = ({
  isOpen,
  onOpenChange,
  folderName,
  onFolderNameChange,
  onCreateFolder
}: CreateFolderDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mega-button-secondary">
          <Plus className="w-4 h-4 mr-2" />
          Nova Pasta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="folder-name">Nome da pasta</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              placeholder="Digite o nome da pasta"
              className="mega-input"
            />
          </div>
          <Button onClick={onCreateFolder} className="mega-button-primary w-full">
            Criar Pasta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};