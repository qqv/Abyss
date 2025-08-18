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
import { parsePostmanCollectionFromJson } from "@/lib/postman-parser";
import { ApiCollection } from "@/lib/api-data";
import { Upload } from "@/components/ui/icons";

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
  const [tab, setTab] = useState("paste");
  const [jsonContent, setJsonContent] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const handlePasteImport = () => {
    try {
      setError("");
      const collection = parsePostmanCollectionFromJson(jsonContent);
      if (collection) {
        onImport(collection);
      } else {
        setError("无法解析集合，请检查JSON格式");
      }
    } catch (err) {
      setError(`导入错误: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFileImport = async () => {
    if (!file) {
      setError("请选择文件");
      return;
    }

    try {
      setError("");
      const content = await file.text();
      const collection = parsePostmanCollectionFromJson(content);
      if (collection) {
        onImport(collection);
      } else {
        setError("无法解析集合，请检查文件格式");
      }
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>导入 API 集合</DialogTitle>
          <DialogDescription>
            导入 Postman Collection 格式的 API 集合
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">粘贴 JSON</TabsTrigger>
            <TabsTrigger value="file">上传文件</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="mt-4">
            <div className="grid gap-4">
              <Textarea
                placeholder="粘贴 Postman Collection JSON 格式内容..."
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
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
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-sm text-gray-500">
                  {file ? `已选择: ${file.name}` : "支持 .json 格式文件"}
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
          <Button onClick={tab === "paste" ? handlePasteImport : handleFileImport}>
            导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
