import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown, MoreVertical, FilePlus, FolderPlus, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { RequestItem } from './RequestItem';
import { FolderItem } from './FolderItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CollectionForm } from './CollectionForm';
import { RequestForm } from './RequestForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';

interface Collection {
  _id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Request {
  _id: string;
  name: string;
  method: string;
  url: string;
  folderId: string | null;
  collectionId: string;
  order: number;
}

interface Folder {
  _id: string;
  name: string;
  collectionId: string;
  parentId: string | null;
  order: number;
}

interface CollectionItemProps {
  collection: Collection;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onUpdate?: (updatedCollection: Collection) => void;
}

export const CollectionItem = ({ collection, onDelete, onDuplicate, onUpdate }: CollectionItemProps) => {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 加载请求和文件夹
  const loadCollectionContents = async () => {
    if (!expanded || loading) return;
    
    try {
      setLoading(true);
      
      // 获取根级请求
      const requestsResponse = await fetch(`/api/v1/requests/collection/${collection._id}`);
      const requestsData = await requestsResponse.json();
      
      if (requestsData.success) {
        // 过滤出根目录中的请求（没有folderId的请求）
        const rootRequests = requestsData.data.filter((req: Request) => !req.folderId);
        setRequests(rootRequests);
      }
      
      // 获取根级文件夹
      const foldersResponse = await fetch(`/api/v1/folders/collection/${collection._id}`);
      const foldersData = await foldersResponse.json();
      
      if (foldersData.success) {
        // 过滤出根目录中的文件夹（没有parentId的文件夹）
        const rootFolders = foldersData.data.filter((folder: Folder) => !folder.parentId);
        setFolders(rootFolders);
      }
    } catch (error) {
      console.error('Error loading collection contents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadCollectionContents();
    }
  }, [expanded, collection._id]);

  // 处理编辑集合
  const handleEditCollection = async (formData: { name: string; description: string; isPublic: boolean }) => {
    try {
      const response = await fetch(`/api/v1/collections/${collection._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`更新集合失败: ${response.status}`);
      }
      
      // API直接返回更新后的集合对象，不是{success:true}格式
      const updatedCollection = await response.json();
      console.log('集合更新成功:', updatedCollection);
      
      // 关闭对话框
      setShowEditDialog(false);
      
      // 通知父组件更新集合列表
      if (onUpdate) {
        onUpdate(updatedCollection);
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  };

  // 处理删除集合
  const handleDeleteCollection = async () => {
    try {
      const response = await fetch(`/api/v1/collections/${collection._id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setShowDeleteDialog(false);
        if (onDelete) {
          onDelete(collection._id);
        }
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  // 创建新请求的处理函数
  const handleCreateRequest = async (formData: any) => {
    try {
      const requestData = {
        ...formData,
        collectionId: collection._id,
        folderId: null, // 根级请求
      };
      
      const response = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error(`创建请求失败: ${response.status}`);
      }
      
      // API直接返回创建的请求对象
      const newRequest = await response.json();
      console.log('创建请求成功:', newRequest);
      
      // 添加新请求到列表中
      setRequests(prev => [...prev, newRequest]);
      setShowNewRequestDialog(false);
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  // 创建新文件夹的处理函数
  const handleCreateFolder = async (name: string) => {
    try {
      const response = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          collectionId: collection._id,
          parentId: null, // 根级文件夹
        }),
      });
      
      if (!response.ok) {
        throw new Error(`创建文件夹失败: ${response.status}`);
      }
      
      // API直接返回创建的文件夹对象
      const newFolder = await response.json();
      console.log('创建文件夹成功:', newFolder);
      
      // 添加新文件夹到列表
      setFolders(prev => [...prev, newFolder]);
      setShowNewFolderDialog(false);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-secondary/50">
        <div 
          className="flex items-center flex-1 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <span className="ml-1 text-sm font-medium">{collection.name}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowNewRequestDialog(true)}>
              <FilePlus className="h-4 w-4 mr-2" />
              <span>{t('apiTesting.collections.createRequestTitle', '新建请求')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              <span>{t('workspace.tree.newFolder', '新建文件夹')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              <span>{t('apiTesting.collections.editCollection', '编辑集合')}</span>
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(collection._id)}>
                <Copy className="h-4 w-4 mr-2" />
                <span>{t('workspace.tree.copy', '复制')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>{t('apiTesting.collections.deleteCollection', '删除集合')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {expanded && (
        <div className="pl-5 pt-1 pb-1">
          {loading ? (
            <div className="py-2 px-2 text-sm text-muted-foreground">{t('proxyPool.common.loading', '加载中...')}</div>
          ) : (
            <>
              {folders.length === 0 && requests.length === 0 ? (
                <div className="py-2 px-2 text-sm text-muted-foreground">{t('apiTesting.collections.emptyTip', '集合为空，创建新请求或文件夹')}</div>
              ) : (
                <>
                  {/* 显示文件夹 */}
                  {folders.map(folder => (
                    <FolderItem 
                      key={folder._id} 
                      folder={folder} 
                      collectionId={collection._id} 
                    />
                  ))}
                  
                  {/* 显示请求 */}
                  {requests.map(request => (
                    <RequestItem 
                      key={request._id} 
                      request={request} 
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* 编辑集合对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.editCollection', '编辑集合')}</DialogTitle>
          </DialogHeader>
          <CollectionForm 
            initialData={{
              name: collection.name,
              description: collection.description,
              isPublic: collection.isPublic
            }}
            onSubmit={handleEditCollection}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 新建请求对话框 */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.createRequestTitle', '新建请求')}</DialogTitle>
          </DialogHeader>
          <RequestForm 
            onSubmit={handleCreateRequest}
            onCancel={() => setShowNewRequestDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 新建文件夹对话框 */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspace.tree.newFolder', '新建文件夹')}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('workspace.tree.newFolder', '新建文件夹')}
                </label>
                <Input 
                  className="mt-2" 
                  placeholder={t('apiTesting.collections.folderNamePlaceholder', '输入文件夹名称')}
                  // 这里应添加文件夹名称状态管理和提交逻辑
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewFolderDialog(false)}
                >
                  {t('actions.reset', '取消')}
                </Button>
                <Button 
                  type="button" 
                  // 这里应添加创建文件夹的处理函数
                >
                  {t('sidebar.dialog.create', '创建')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('workspace.tree.confirmDeleteCollection', '确定要删除集合 "{{name}}" 吗？这将删除所有关联的请求和文件夹。', { name: collection.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workspace.tree.confirmDeleteGeneric', '确定要删除此项吗？此操作无法撤销。')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.reset', '取消')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollection} className="bg-red-600 text-white hover:bg-red-700">
              {t('workspace.tree.deleteCollection', '删除集合')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
