import { Image, File, FileText, FileSpreadsheet } from "lucide-react";
import { FileItem } from "./types";

interface FileIconProps {
  file: FileItem;
  isGrid?: boolean;
}

export const FileIcon = ({ file, isGrid = false }: FileIconProps) => {
  // Increased icon sizes for grid view
  const iconSizeClasses = isGrid ? "w-16 h-16" : "w-6 h-6"; // e.g., 64px for grid
  const folderIconSizeClass = isGrid ? 'text-6xl' : 'text-2xl'; // e.g., 60px for grid folder emoji
  const internalFontSizeClass = isGrid ? 'text-sm' : 'text-xs'; // Font size for text inside icons (PDF, W, X)

  if (file.type === "folder") {
    return <span className={folderIconSizeClass}>📁</span>;
  }
  
  if (file.mimeType?.startsWith("image/")) {
    return <Image className={`${iconSizeClasses} text-green-500`} />;
  }
  
  if (file.mimeType?.includes("pdf")) {
    return (
      <div className={`${iconSizeClasses} rounded-lg bg-red-500 flex items-center justify-center`}>
        <span className={`text-white font-bold ${internalFontSizeClass}`}>PDF</span>
      </div>
    );
  }
  
  if (file.mimeType?.includes("word")) {
    return (
      <div className={`${iconSizeClasses} rounded-lg bg-blue-500 flex items-center justify-center`}>
        <span className={`text-white font-bold ${internalFontSizeClass}`}>W</span>
      </div>
    );
  }
  
  if (file.mimeType?.includes("excel") || file.mimeType?.includes("spreadsheet")) {
    return (
      <div className={`${iconSizeClasses} rounded-lg bg-green-600 flex items-center justify-center`}>
        <span className={`text-white font-bold ${internalFontSizeClass}`}>X</span>
      </div>
    );
  }
  
  if (file.mimeType?.includes("powerpoint") || file.mimeType?.includes("presentation")) {
    return (
      <div className={`${iconSizeClasses} rounded-lg bg-orange-500 flex items-center justify-center`}>
        <span className={`text-white font-bold ${internalFontSizeClass}`}>P</span>
      </div>
    );
  }
  
  if (file.mimeType?.includes("zip") || file.mimeType?.includes("rar")) {
    return <File className={`${iconSizeClasses} text-purple-600`} />;
  }
  
  // Default file icon
  return (
    <div className={`${iconSizeClasses} rounded-lg bg-gray-400 flex items-center justify-center`}>
      <span className={`text-white font-bold ${isGrid ? 'text-2xl' : 'text-xs'}`}>📄</span> {/* Emoji for default file */}
    </div>
  );
};