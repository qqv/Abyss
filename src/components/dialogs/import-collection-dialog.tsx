"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiCollection } from "@/lib/api-data";
import { v4 as uuidv4 } from "uuid";

interface ImportCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (collection: ApiCollection) => void;
}

export default function ImportCollectionDialog({
  open,
  onOpenChange,
  onImport
}: ImportCollectionDialogProps) {
  const [importData, setImportData] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    try {
      setError(null);
      const data = JSON.parse(importData);
      
      // 基本验证
      if (!data.name) {
        throw new Error("导入数据缺少必要的name字段");
      }
      
      // 确保有ID字段
      const collectionId = data._id || data.id || uuidv4();
      
      // 构建ApiCollection对象
      const collection: ApiCollection = {
        _id: collectionId,
        id: collectionId,
        name: data.name,
        description: data.description || "",
        items: data.items || data.folders || [], // 兼容旧格式的folders属性
        variables: data.variables || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      onImport(collection);
      setImportData("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入数据格式无效");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>导入API集合</DialogTitle>
          <DialogDescription>
            请粘贴有效的API集合JSON数据进行导入。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="粘贴API集合JSON数据..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setError(null);
              setImportData("");
              onOpenChange(false);
            }}
          >
            取消
          </Button>
          <Button onClick={handleImport}>导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
