import { Image, File, FileText, FileSpreadsheet, FileCode, FileVideo, FileAudio, FileMusic, FileImage, Files, FilePen } from "lucide-react";
import { FileItem } from "./types";

interface FileIconProps {
  file: FileItem;
  isGrid?: boolean;
}

export const FileIcon = ({ file, isGrid = false }: FileIconProps) => {
  const iconSizeClasses = isGrid ? "w-16 h-16" : "w-6 h-6";
  const folderIconSizeClass = isGrid ? 'text-6xl' : 'text-2xl';
  const internalFontSizeClass = isGrid ? 'text-sm' : 'text-xs';

  if (file.type === "folder") {
    return <span className={folderIconSizeClass}>📁</span>;
  }

  // Ícones específicos por tipo MIME
  switch (file.mimeType) {
    case 'application/pdf':
      return <File className={`${iconSizeClasses} text-red-500`} />;
    
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <FileText className={`${iconSizeClasses} text-blue-500`} />;
    
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return <FileSpreadsheet className={`${iconSizeClasses} text-green-500`} />;
    
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return <FileImage className={`${iconSizeClasses} text-orange-500`} />;
    
    case 'application/zip':
    case 'application/x-zip-compressed':
    case 'application/x-rar-compressed':
      return <FilePen className={`${iconSizeClasses} text-purple-500`} />;
    
    case 'text/plain':
      return <File className={`${iconSizeClasses} text-gray-500`} />;
    
    case 'image/jpeg':
    case 'image/jpg':
      return <Image className={`${iconSizeClasses} text-blue-500`} />;
    
    case 'image/png':
      return <Image className={`${iconSizeClasses} text-green-500`} />;
    
    case 'image/gif':
      return <Image className={`${iconSizeClasses} text-purple-500`} />;
    
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/ogg':
      return <FileAudio className={`${iconSizeClasses} text-yellow-500`} />;
    
    case 'video/mp4':
    case 'video/webm':
    case 'video/quicktime':
      return <FileVideo className={`${iconSizeClasses} text-red-500`} />;
    
    case 'application/json':
      return <File className={`${iconSizeClasses} text-yellow-500`} />;
    
    case 'text/csv':
      return <File className={`${iconSizeClasses} text-green-500`} />;
    
    default:
      if (file.mimeType?.startsWith('image/')) {
        return <Image className={`${iconSizeClasses} text-green-500`} />;
      }
      return <File className={`${iconSizeClasses} text-gray-500`} />;
  }
};