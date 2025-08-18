"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ApiCollection, ApiFolder } from "@/lib/api-data";
import { fetchApiCollection, updateApiCollection } from "@/components/services/collection-service";
import { toast } from "@/components/ui/use-toast";

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: ApiFolder; // 如果提供，则为编辑模式
  collectionId: string;
  parentFolderId?: string; // 可选的父文件夹ID
  onSuccess: () => void;
}

export function FolderDialog({
  isOpen,
  onClose,
  folder,
  collectionId,
  parentFolderId,
  onSuccess
}: FolderDialogProps) {
  const [name, setName] = useState(folder?.name || "");
  const [selectedParentId, setSelectedParentId] = useState(parentFolderId || "");
  const [loading, setLoading] = useState(false);
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  
  // 加载集合和文件夹列表
  useEffect(() => {
    if (isOpen && collectionId) {
      const loadCollection = async () => {
        try {
          const data = await fetchApiCollection(collectionId);
          if (data) {
            setCollection(data);
            
            // 提取所有文件夹
            const folderList: ApiFolder[] = [];
            
            // 递归提取文件夹
            const extractFolders = (items: any[], parentPath: string = "") => {
              for (const item of items) {
                if (!('url' in item)) { // 是文件夹
                  const folderPath = parentPath ? `${parentPath} / ${item.name}` : item.name;
                  folderList.push({
                    ...item,
                    path: folderPath
                  });
                  
                  if (item.items && item.items.length > 0) {
                    extractFolders(item.items, folderPath);
                  }
                }
              }
            };
            
            // 从集合中提取文件夹
            if (data.folders && data.folders.length > 0) {
              extractFolders(data.folders);
            } else if (data.items) {
              const folderItems = data.items.filter(item => !('url' in item));
              extractFolders(folderItems);
            }
            
            setFolders(folderList);
          }
        } catch (error) {
          console.error("加载集合失败:", error);
          toast({
            title: "加载失败",
            description: "无法加载集合数据",
            variant: "destructive"
          });
        }
      };
      
      loadCollection();
    }
  }, [isOpen, collectionId]);
  
  // 重置表单
  const resetForm = () => {
    if (folder) {
      setName(folder.name);
      setSelectedParentId(folder.parentId || "");
    } else {
      setName("");
      setSelectedParentId(parentFolderId || "");
    }
  };
  
  // 处理对话框打开状态变化
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };
  
  // 创建或更新文件夹
  const createOrUpdateFolder = async () => {
    if (!collection) return null;
    
    const newFolder: ApiFolder = {
      _id: folder?._id || `folder_${Date.now()}`,
      id: folder?.id,
      name,
      parentId: selectedParentId || undefined,
      items: folder?.items || []
    };
    
    // 递归更新文件夹
    const updateFolderInCollection = (items: any[], folderId: string, updatedFolder: ApiFolder): any[] => {
      return items.map(item => {
        if (!('url' in item)) { // 是文件夹
          if ((item._id || item.id) === folderId) {
            return updatedFolder;
          } else if (item.items && item.items.length > 0) {
            return {
              ...item,
              items: updateFolderInCollection(item.items, folderId, updatedFolder)
            };
          }
        }
        return item;
      });
    };
    
    // 递归添加文件夹
    const addFolderToCollection = (items: any[], parentId: string | undefined, newFolder: ApiFolder): any[] => {
      if (!parentId) {
        return [...items, newFolder];
      }
      
      return items.map(item => {
        if (!('url' in item)) { // 是文件夹
          if ((item._id || item.id) === parentId) {
            return {
              ...item,
              items: [...(item.items || []), newFolder]
            };
          } else if (item.items && item.items.length > 0) {
            return {
              ...item,
              items: addFolderToCollection(item.items, parentId, newFolder)
            };
          }
        }
        return item;
      });
    };
    
    let updatedCollection: ApiCollection;
    
    if (folder) {
      // 更新现有文件夹
      const updatedItems = collection.items 
        ? updateFolderInCollection(collection.items, folder._id, newFolder)
        : collection.items;
      
      updatedCollection = {
        ...collection,
        items: updatedItems
      };
    } else {
      // 创建新文件夹
      const updatedItems = collection.items 
        ? addFolderToCollection(collection.items, selectedParentId, newFolder)
        : [newFolder];
      
      updatedCollection = {
        ...collection,
        items: updatedItems
      };
    }
    
    // 更新集合
    return await updateApiCollection(updatedCollection);
  };
  
  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "错误",
        description: "文件夹名称不能为空",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await createOrUpdateFolder();
      
      if (result) {
        toast({
          title: "成功",
          description: folder ? "文件夹已更新" : "文件夹已创建"
        });
        
        onSuccess();
        onClose();
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存文件夹失败:", error);
      toast({
        title: "错误",
        description: "保存文件夹失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {folder ? "编辑文件夹" : "创建新文件夹"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">文件夹名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入文件夹名称"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="parent">父文件夹</Label>
            <Select 
              value={selectedParentId} 
              onValueChange={setSelectedParentId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="根目录 (无父文件夹)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">根目录</SelectItem>
                {folders.filter(f => (f._id || f.id) !== (folder?._id || folder?.id)).map(f => (
                  <SelectItem key={f._id || f.id} value={f._id || f.id || ""}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
            >
              {loading ? "保存中..." : (folder ? "保存" : "创建")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
