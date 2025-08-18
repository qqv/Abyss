"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiWorkspace } from "@/features/api-workspace";
import { Play, Database, File, FolderTree, Plus, Download } from "lucide-react";
import RequestPanel from "./request-panel";

// 正确导入对话框组件
import ImportCollectionDialog from "@/components/dialogs/import-collection-dialog";
import ImportParametersDialog from "@/components/dialogs/import-parameters-dialog";
import RunCollectionDialog from "@/components/dialogs/run-collection-dialog";
import CreateRequestDialog from "@/components/dialogs/create-request-dialog";

import { 
  ApiCollection, 
  ApiRequest, 
  ApiFolder,
  ParameterSet,
  HttpMethod
} from "@/lib/api-data";
import { fetchApiCollections } from "./services/collection-service";

interface ApiCollectionViewProps {
  onRunCollection: (collectionId: string, parameterSetId?: string) => void;
  onViewResults: (jobId: string) => void;
}

export default function ApiCollectionView({ 
  onRunCollection, 
  onViewResults 
}: ApiCollectionViewProps) {
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  // 从API获取集合数据
  const getCollections = async () => {
    setLoading(true);
    
    try {
      const apiCollections = await fetchApiCollections();
      setCollections(apiCollections);
      
      // 如果有集合数据但当前没有选中集合，选择第一个
      if (apiCollections.length > 0 && !selectedCollectionId) {
        // 使用_id或id，确保不会传递undefined
        setSelectedCollectionId(apiCollections[0]._id || apiCollections[0].id || null);
      }
    } catch (error) {
      console.error('加载API集合失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // 初始加载集合
    getCollections();
  }, []);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isImportCollectionOpen, setIsImportCollectionOpen] = useState(false);
  const [isImportParametersOpen, setIsImportParametersOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);

  // 获取当前选中的集合
  const selectedCollection = collections.find(
    collection => collection.id === selectedCollectionId
  );

  // 获取当前选中的请求
  let selectedRequest: ApiRequest | null = null;
  if (selectedCollection && selectedRequestId) {
    // 平铺所有请求，包括文件夹中的
    const findRequest = (items: (ApiRequest | ApiFolder)[]): ApiRequest | null => {
      for (const item of items) {
        if ('url' in item && item.id === selectedRequestId) {
          return item;
        } else if ('items' in item) {
          const found = findRequest(item.items);
          if (found) return found;
        }
      }
      return null;
    };
    
    selectedRequest = findRequest(selectedCollection.items);
  }

  // 递归渲染集合项目（请求和文件夹）
  const renderCollectionItems = (items: (ApiRequest | ApiFolder)[], prefix: string = '') => {
    return items.map((item, index) => {
      // 创建一个更具唯一性的key，基于路径
      const itemKey = `${prefix}_${item.id}_${index}`;
      
      if ('url' in item) {
        // 是一个请求
        return (
          <div 
            key={itemKey} 
            className={`flex items-center p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${selectedRequestId === (item._id || item.id) ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            onClick={() => setSelectedRequestId(item._id || item.id || null)}
          >
            <File className="h-4 w-4 mr-2" />
            <span className="truncate">{item.name}</span>
            <span className="ml-auto text-xs font-mono text-gray-500">{item.method}</span>
          </div>
        );
      } else {
        // 是一个文件夹
        return (
          <div key={itemKey} className="mb-2">
            <div className="flex items-center p-2 text-sm font-medium">
              <FolderTree className="h-4 w-4 mr-2" />
              <span>{item.name}</span>
            </div>
            <div className="pl-4">
              {renderCollectionItems(item.items, itemKey)}
            </div>
          </div>
        );
      }
    });
  };

  const handleImportCollection = async (collection: ApiCollection) => {
    try {
      // 添加到当前状态中
      setCollections(prev => [...prev, collection]);
      // 使用_id或id，确保不会传递undefined
      setSelectedCollectionId(collection._id || collection.id || null);
      setIsImportCollectionOpen(false);
      
      // 重新加载集合列表，确保包含最新数据
      await getCollections();
    } catch (error) {
      console.error('导入集合后刷新失败:', error);
    }
  };

  const handleRunCollection = (collectionId: string, parameterSetId?: string) => {
    onRunCollection(collectionId, parameterSetId);
    setIsRunDialogOpen(false);
  };

  // 处理创建新请求
  const handleCreateRequest = (newRequest: ApiRequest) => {
    if (!selectedCollectionId) return;
    
    try {
      // 找到当前选中的集合
      const updatedCollections = collections.map(collection => {
        if ((collection._id || collection.id) === selectedCollectionId) {
          // 使用items而不是requests
          const currentItems = collection.items || [];
          return {
            ...collection,
            items: [...currentItems, newRequest]
          };
        }
        return collection;
      });
      
      setCollections(updatedCollections);
      setSelectedRequestId(newRequest._id || newRequest.id || null);
      setIsNewRequestDialogOpen(false);
    } catch (error) {
      console.error('创建请求失败:', error);
    }
  };

  return (
    <div className="h-full">
      <ApiWorkspace />
    </div>
  );
}
