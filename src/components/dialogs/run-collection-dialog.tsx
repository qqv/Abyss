"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RunCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onRun: (collectionId: string, parameterSetId?: string) => void;
}

// 模拟参数集数据，实际应用中应该从API获取
const mockParameterSets = [
  { _id: "param1", id: "param1", name: "测试环境参数" },
  { _id: "param2", id: "param2", name: "生产环境参数" },
];

export default function RunCollectionDialog({
  open,
  onOpenChange,
  collectionId,
  onRun
}: RunCollectionDialogProps) {
  const [selectedParameterSet, setSelectedParameterSet] = useState<string>("");
  const [parameterSets, setParameterSets] = useState(mockParameterSets);
  
  useEffect(() => {
    // 如果对话框打开，重置选择
    if (open) {
      setSelectedParameterSet("");
    }
  }, [open]);

  // 在实际应用中，这里可以根据collectionId获取该集合的参数集
  // useEffect(() => {
  //   const fetchParameterSets = async () => {
  //     try {
  //       const response = await fetch(`/api/collections/${collectionId}/parameter-sets`);
  //       const data = await response.json();
  //       setParameterSets(data);
  //     } catch (error) {
  //       console.error("获取参数集失败", error);
  //     }
  //   };
  // 
  //   if (collectionId) {
  //     fetchParameterSets();
  //   }
  // }, [collectionId]);

  const handleRun = () => {
    onRun(collectionId, selectedParameterSet || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>运行API集合</DialogTitle>
          <DialogDescription>
            选择一个参数集来运行此API集合，或者不选择参数集直接运行。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="parameter-set">参数集（可选）</Label>
            <Select
              value={selectedParameterSet}
              onValueChange={setSelectedParameterSet}
            >
              <SelectTrigger id="parameter-set">
                <SelectValue placeholder="选择参数集（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">无参数集</SelectItem>
                {parameterSets.map((param) => (
                  <SelectItem key={param._id || param.id} value={param._id || param.id || ""}>
                    {param.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleRun}>运行</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
