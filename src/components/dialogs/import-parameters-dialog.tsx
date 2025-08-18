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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";

interface ImportParametersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
}

export default function ImportParametersDialog({
  open,
  onOpenChange,
  collectionId
}: ImportParametersDialogProps) {
  const [name, setName] = useState("");
  const [parameterData, setParameterData] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    try {
      setError(null);
      
      if (!name.trim()) {
        setError("参数集名称不能为空");
        return;
      }
      
      const data = JSON.parse(parameterData);
      
      // 在实际应用中，这里会将参数集保存到数据库或状态中
      // 这里仅作为示例
      
      console.log("导入参数集", {
        id: uuidv4(),
        name,
        collectionId,
        parameters: data,
        createdAt: new Date().toISOString()
      });
      
      // 成功导入后重置表单并关闭对话框
      setName("");
      setParameterData("");
      onOpenChange(false);
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入数据格式无效");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>导入参数集</DialogTitle>
          <DialogDescription>
            为集合添加可重复使用的参数集，用于批量测试API。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parameter-set-name">参数集名称</Label>
            <Input
              id="parameter-set-name"
              placeholder="输入参数集名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="parameter-data">参数数据（JSON格式）</Label>
            <Textarea
              id="parameter-data"
              placeholder='{"key1": "value1", "key2": "value2"}'
              value={parameterData}
              onChange={(e) => setParameterData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setError(null);
              setName("");
              setParameterData("");
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
