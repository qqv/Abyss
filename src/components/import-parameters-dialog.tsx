"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload } from "@/components/ui/icons";
import { ParameterSet } from "@/lib/api-data";

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
  const [tab, setTab] = useState("paste");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [paramName, setParamName] = useState("domain");
  const [setName, setSetName] = useState("新参数集");
  const [error, setError] = useState("");
  
  const parseParameters = (content: string): string[] => {
    // 解析参数文本内容，假设每行一个值，忽略空行和第一行标题
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== "");
    
    // 如果第一行是标题，则跳过
    if (lines.length > 0 && lines[0].toLowerCase() === paramName.toLowerCase()) {
      return lines.slice(1);
    }
    
    return lines;
  };
  
  const handleImport = async () => {
    try {
      setError("");
      let content = textContent;
      
      if (tab === "file" && file) {
        content = await file.text();
      }
      
      if (!content.trim()) {
        setError("请输入或上传参数内容");
        return;
      }
      
      const parameters = parseParameters(content);
      
      if (parameters.length === 0) {
        setError("未找到有效参数值");
        return;
      }
      
      // 创建新的参数集
      const parameterSet: ParameterSet = {
        id: `param-${Date.now()}`,
        name: setName,
        variables: {
          [paramName]: parameters
        },
        createdAt: new Date().toISOString()
      };
      
      // 这里保存参数集，在实际应用中可能需要保存到全局状态或存储
      console.log("导入参数集:", parameterSet);
      
      // TODO: 在实际应用中，这里应该将参数集添加到状态管理系统中
      
      // 关闭对话框
      onOpenChange(false);
    } catch (err) {
      setError(`导入错误: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导入参数集</DialogTitle>
          <DialogDescription>
            导入包含批量参数值的文本文件
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="param-set-name" className="text-right">
              参数集名称
            </Label>
            <Input
              id="param-set-name"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="param-name" className="text-right">
              参数名称
            </Label>
            <Input
              id="param-name"
              value={paramName}
              onChange={(e) => setParamName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">粘贴内容</TabsTrigger>
            <TabsTrigger value="file">上传文件</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="mt-4">
            <div className="grid gap-4">
              <Textarea
                placeholder="每行一个参数值，例如：
domain
a.com
b.net
c.org"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="file" className="mt-4">
            <div className="grid gap-4">
              <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <Label htmlFor="file-upload" className="mb-2 cursor-pointer">
                  选择文件或拖放到此处
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-sm text-gray-500">
                  {file ? `已选择: ${file.name}` : "支持 .txt 和 .csv 格式文件"}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleImport}>
            导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
