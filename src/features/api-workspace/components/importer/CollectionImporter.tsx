"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Import, ChevronDown, FileJson } from "lucide-react";
import { PostmanImporter } from "./PostmanImporter";
import { useTranslation } from "react-i18next";

interface CollectionImporterProps {
  onImportSuccess: () => void;
}

export function CollectionImporter({ onImportSuccess }: CollectionImporterProps) {
  const [showPostmanImporter, setShowPostmanImporter] = useState(false);
  const { t } = useTranslation('common');
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <Import className="h-4 w-4" />
            {t('workspace.import.importCollection', '导入集合')}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowPostmanImporter(true)}>
            <FileJson className="h-4 w-4 mr-2" />
            {t('workspace.import.importPostman', '导入Postman集合')}
          </DropdownMenuItem>
          {/* 未来可以添加其他导入源，如Swagger、OpenAPI等 */}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {showPostmanImporter && (
        <PostmanImporter 
          onImportSuccess={() => {
            onImportSuccess();
            setShowPostmanImporter(false);
          }} 
        />
      )}
    </>
  );
}
