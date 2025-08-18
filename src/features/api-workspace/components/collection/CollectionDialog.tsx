"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiCollection } from "@/lib/api-data";
import { createApiCollection, updateApiCollection } from "@/components/services/collection-service";
import { toast } from "@/components/ui/use-toast";

interface CollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: ApiCollection; // 如果提供，则为编辑模式
  onSuccess: () => void;
}

export function CollectionDialog({
  isOpen,
  onClose,
  collection,
  onSuccess
}: CollectionDialogProps) {
  const [name, setName] = useState(collection?.name || "");
  const [description, setDescription] = useState(collection?.description || "");
  const [loading, setLoading] = useState(false);
  
  // 重置表单
  const resetForm = () => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || "");
    } else {
      setName("");
      setDescription("");
    }
  };
  
  // 处理对话框打开状态变化
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };
  
  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "错误",
        description: "集合名称不能为空",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      if (collection) {
        // 更新模式
        await updateApiCollection({
          ...collection,
          name,
          description,
          updatedAt: new Date().toISOString()
        });
        toast({
          title: "成功",
          description: "集合已更新"
        });
      } else {
        // 创建模式
        await createApiCollection(name, description);
        toast({
          title: "成功",
          description: "集合已创建"
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("保存集合失败:", error);
      toast({
        title: "错误",
        description: "保存集合失败",
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
            {collection ? "编辑集合" : "创建新集合"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">集合名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入集合名称"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入集合描述"
              disabled={loading}
              rows={3}
            />
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
              {loading ? "保存中..." : (collection ? "保存" : "创建")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
