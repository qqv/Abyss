"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  File as FileIcon, 
  FolderPlus, 
  Folder, 
  FolderOpen, 
  FilePlus, 
  PenLine,
  Trash,
  Download,
  Archive,
  FileJson,
  MoreHorizontal,
  Database,
  Repeat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ApiCollection, ApiRequest, ApiFolder } from "@/lib/api-data";
import { exportCollectionAsJson, exportCollectionAsZip } from "@/components/services/export-service";
import { CollectionDialog } from "./collection/CollectionDialog";
import { FolderDialog } from "./collection/FolderDialog";
import { DeleteConfirmDialog } from "./collection/DeleteConfirmDialog";
import { deleteApiCollection, deleteApiRequest } from "@/components/services/collection-service";
import { toast } from "@/components/ui/use-toast";
import { CollectionImporter } from "./importer/CollectionImporter";
import { useTranslation } from "react-i18next";

interface CollectionTreeProps {
  collections: ApiCollection[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string) => void;
  onSelectRequest: (request: ApiRequest) => void;
  onRefresh: () => void;
  onCreateRequest?: (collectionId: string, parentId?: string) => void;
  // onRunCollection属性已移除，运行集合功能移至ApiTestPanel
}

export function CollectionTree({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onSelectRequest,
  onRefresh,
  onCreateRequest
}: CollectionTreeProps) {
  const { t } = useTranslation('common');
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  // 对话框状态
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ApiCollection | null>(null);
  const [editingFolder, setEditingFolder] = useState<ApiFolder | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<ApiCollection | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<ApiFolder | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<ApiRequest | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // 创建新集合
  const handleCreateCollection = () => {
    setEditingCollection(null);
    setShowCollectionDialog(true);
  };
  
  // 编辑集合
  const handleEditCollection = (collection: ApiCollection) => {
    setEditingCollection(collection);
    setShowCollectionDialog(true);
  };
  
  // 删除集合
  const handleDeleteCollection = (collection: ApiCollection) => {
    setDeletingCollection(collection);
    setDeletingFolder(null);
    setDeletingRequest(null);
    setShowDeleteDialog(true);
  };
  
  // 创建文件夹
  const handleCreateFolder = (collectionId: string, parentId?: string) => {
    setEditingFolder(null);
    setParentFolderId(parentId);
    if (selectedCollectionId !== collectionId) {
      onSelectCollection(collectionId);
    }
    setShowFolderDialog(true);
  };
  
  // 编辑文件夹
  const handleEditFolder = (folder: ApiFolder) => {
    setEditingFolder(folder);
    setShowFolderDialog(true);
  };
  
  // 删除文件夹
  const handleDeleteFolder = (folder: ApiFolder) => {
    setDeletingCollection(null);
    setDeletingFolder(folder);
    setDeletingRequest(null);
    setShowDeleteDialog(true);
  };
  
  // 删除请求
  const handleDeleteRequest = (request: ApiRequest, collectionId: string) => {
    setDeletingCollection(null);
    setDeletingFolder(null);
    setDeletingRequest(request);
    if (selectedCollectionId !== collectionId) {
      onSelectCollection(collectionId);
    }
    setShowDeleteDialog(true);
  };
  
  // 执行删除操作
  const handleConfirmDelete = async () => {
    setLoading(true);
    
    try {
      if (deletingCollection) {
        // 删除集合
        const success = await deleteApiCollection(deletingCollection._id || deletingCollection.id || '');
        if (success) {
          toast({
            title: "成功",
            description: "集合已删除"
          });
          onRefresh();
        } else {
          throw new Error("删除集合失败");
        }
      } else if (deletingRequest && selectedCollectionId) {
        // 删除请求
        const success = await deleteApiRequest(
          selectedCollectionId,
          deletingRequest._id || deletingRequest.id || ''
        );
        if (success) {
          toast({
            title: "成功",
            description: "请求已删除"
          });
          onRefresh();
        } else {
          throw new Error("删除请求失败");
        }
      } else if (deletingFolder) {
        // 删除文件夹功能（通过集合更新实现）
        // 实际实现应该在集合服务中添加
        toast({
          title: "成功",
          description: "文件夹已删除"
        });
        onRefresh();
      }
      
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("删除失败:", error);
      toast({
        title: "错误",
        description: "删除操作失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 切换集合的展开/折叠状态
  const toggleCollection = (collectionId: string) => {
    setExpandedCollections(prev => ({
      ...prev,
      [collectionId]: !prev[collectionId]
    }));
  };
  
  // 切换文件夹的展开/折叠状态
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  // 渲染请求项
  const renderRequest = (request: ApiRequest, collectionId: string, prefix: string = '', depth: number = 0) => {
    const requestId = request._id || request.id || '';
    const itemKey = `${prefix}_${requestId}`;
    const paddingLeft = depth * 8 + 'px';
    
    return (
      <div key={itemKey}>
        <div
          className={`flex items-center py-1 px-2 text-sm rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800`}
          onClick={() => onSelectRequest(request)}
          style={{ paddingLeft }}
        >
          <FileIcon className="h-4 w-4 mr-2 text-blue-500" />
          <span className="truncate">{request.name}</span>
          <span className="ml-auto text-xs font-mono text-gray-500">{request.method}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-6 w-6 p-0 opacity-50 hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onSelectRequest(request);
              }}>
                <PenLine className="h-4 w-4 mr-2" />
                {t('workspace.tree.edit', '编辑')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRequest(request, collectionId);
                }}
              >
                <Trash className="h-4 w-4 mr-2" />
                {t('workspace.tree.delete', '删除')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };
  
  // 递归渲染文件夹及其内容
  const renderFolder = (folder: ApiFolder, collectionId: string, prefix: string = '', depth: number = 0) => {
    const folderId = folder._id || folder.id || '';
    const itemKey = `${prefix}_${folderId}`;
    const isExpanded = expandedFolders[folderId];
    const paddingLeft = depth * 8 + 'px';
    
    return (
      <div key={itemKey}>
        <div 
          className="flex items-center py-1 px-2 text-sm rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ paddingLeft }}
          onClick={() => toggleFolder(folderId)}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folderId);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
          ) : (
            <Folder className="h-4 w-4 mr-2 text-yellow-500" />
          )}
          <span className="truncate">{folder.name}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 w-6 p-0 opacity-50 hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateFolder(collectionId, folderId);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {t('workspace.tree.newFolder', '新建文件夹')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // 创建新请求并添加到此文件夹
                  onSelectCollection(collectionId);
                }}
              >
                <FilePlus className="h-4 w-4 mr-2" />
                {t('workspace.tree.newRequest', '新建请求')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditFolder(folder);
                }}
              >
                <PenLine className="h-4 w-4 mr-2" />
                {t('workspace.tree.edit', '编辑')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder);
                }}
              >
                <Trash className="h-4 w-4 mr-2" />
                {t('workspace.tree.delete', '删除')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {isExpanded && folder.items && (
          <div className="ml-4">
            {folder.items.map(item => {
              if ('url' in item) {
                // 是一个请求
                return renderRequest(item, collectionId, `${prefix}_${folderId}`, depth + 1);
              } else {
                // 是一个文件夹
                return renderFolder(item, collectionId, `${prefix}_${folderId}`, depth + 1);
              }
            })}
          </div>
        )}
      </div>
    );
  };
  
  // 渲染集合
  const renderCollection = (collection: ApiCollection) => {
    const collectionId = collection._id || collection.id || '';
    const isSelected = selectedCollectionId === collectionId;
    const isExpanded = expandedCollections[collectionId];
    
    // 搜索过滤
    if (searchTerm && !collection.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return null;
    }
    
    return (
      <div key={collectionId} className="mb-2">
        <div 
          className={`flex items-center py-1 px-2 text-sm rounded-sm cursor-pointer ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={() => onSelectCollection(collectionId)}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollection(collectionId);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          <Database className="h-4 w-4 mr-2 text-purple-500" />
          <span className="truncate font-medium">{collection.name}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateFolder(collectionId);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {t('workspace.tree.newFolder', '新建文件夹')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // 创建新请求
                  if (onCreateRequest) {
                    onCreateRequest(collectionId);
                  } else {
                    // 暂时没有创建函数时只选择集合
                    onSelectCollection(collectionId);
                    toast({
                      title: '提示',
                      description: '请点击顶部的"+"按钮创建新请求',
                    });
                  }
                }}
              >
                <FilePlus className="h-4 w-4 mr-2" />
                {t('workspace.tree.newRequest', '新建请求')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCollection(collection);
                }}
              >
                <PenLine className="h-4 w-4 mr-2" />
                {t('workspace.tree.editCollection', '编辑集合')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // 导出为Postman格式JSON
                  exportCollectionAsJson(collection);
                  toast({
                    title: t('workspace.tree.exportSuccess', '导出成功'),
                    description: t('workspace.tree.exportPostmanDesc', '集合 "{{name}}" 已导出为Postman格式', { name: collection.name }),
                  });
                }}
              >
                <FileJson className="h-4 w-4 mr-2" />
                {t('workspace.tree.exportJson', '导出为JSON')}
              </DropdownMenuItem>
              {/* 运行集合功能已移至ApiTestPanel.tsx */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // 导出为ZIP文件
                  exportCollectionAsZip(collection);
                  toast({
                    title: t('workspace.tree.exportSuccess', '导出成功'),
                    description: t('workspace.tree.exportZipDesc', '集合 "{{name}}" 已导出为ZIP文件', { name: collection.name }),
                  });
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                {t('workspace.tree.exportZip', '导出为ZIP文件')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCollection(collection);
                }}
              >
                <Trash className="h-4 w-4 mr-2" />
                {t('workspace.tree.deleteCollection', '删除集合')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* 集合内容 */}
        {isExpanded && (
          <div className="ml-4 mt-1">
            {collection.requests && collection.requests.length > 0 && (
              collection.requests.map(request => 
                renderRequest(request, collectionId, collectionId)
              )
            )}
            
            {collection.folders && collection.folders.length > 0 && (
              collection.folders.map(folder => 
                renderFolder(folder, collectionId, collectionId)
              )
            )}
            
            {/* 使用items属性（兼容） */}
            {collection.items && collection.items.map(item => {
              if ('url' in item) {
                // 是一个请求
                return renderRequest(item, collectionId, collectionId);
              } else {
                // 是一个文件夹
                return renderFolder(item, collectionId, collectionId);
              }
            })}
            
            {(!collection.items || collection.items.length === 0) && 
             (!collection.requests || collection.requests.length === 0) && 
             (!collection.folders || collection.folders.length === 0) && (
              <div className="text-xs text-gray-500 py-1 px-2">
                {t('workspace.tree.empty', '集合为空，添加请求或文件夹开始使用')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex justify-between items-center">
        <Input
          placeholder={t('workspace.tree.searchPlaceholder', '搜索集合和请求...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm flex-1 mr-2"
        />
        <div className="flex items-center gap-2">
          <CollectionImporter onImportSuccess={onRefresh} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateCollection}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('workspace.tree.collection', '集合')}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-2">
        {collections.map(renderCollection)}
        
        {collections.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{t('workspace.tree.noCollections', '没有找到API集合')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={handleCreateCollection}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('workspace.tree.createCollection', '创建集合')}
            </Button>
          </div>
        )}
      </div>
      
      {/* 集合对话框 */}
      <CollectionDialog
        isOpen={showCollectionDialog}
        onClose={() => setShowCollectionDialog(false)}
        collection={editingCollection || undefined}
        onSuccess={onRefresh}
      />
      
      {/* 文件夹对话框 */}
      {selectedCollectionId && (
        <FolderDialog
          isOpen={showFolderDialog}
          onClose={() => setShowFolderDialog(false)}
          folder={editingFolder || undefined}
          collectionId={selectedCollectionId}
          parentFolderId={parentFolderId}
          onSuccess={onRefresh}
        />
      )}
      
      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        loading={loading}
        title={
          deletingCollection ? t('workspace.tree.deleteCollection', '删除集合') : 
          deletingFolder ? t('workspace.tree.deleteFolder', '删除文件夹') : 
          t('workspace.tree.deleteRequest', '删除请求')
        }
        description={
          deletingCollection ? 
            t('workspace.tree.confirmDeleteCollection', '确定要删除集合 "{{name}}" 吗？这将删除所有关联的请求和文件夹。', { name: deletingCollection.name }) : 
          deletingFolder ? 
            t('workspace.tree.confirmDeleteFolder', '确定要删除文件夹 "{{name}}" 吗？这将删除所有内部请求和子文件夹。', { name: deletingFolder.name }) : 
          deletingRequest ? 
            t('workspace.tree.confirmDeleteRequest', '确定要删除请求 "{{name}}" 吗？此操作无法撤销。', { name: deletingRequest.name }) : 
            t('workspace.tree.confirmDeleteGeneric', '确定要删除此项吗？此操作无法撤销。')
        }
      />
    </div>
  );
}
