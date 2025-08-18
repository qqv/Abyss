import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown, MoreVertical, FilePlus, FolderPlus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RequestItem } from './RequestItem';
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

interface Folder {
  _id: string;
  name: string;
  collectionId: string;
  parentId: string | null;
  order: number;
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

interface FolderItemProps {
  folder: Folder;
  collectionId: string;
}

export const FolderItem = ({ folder, collectionId }: FolderItemProps) => {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  const [newFolderName, setNewFolderName] = useState('');

  // 加载文件夹内容
  const loadFolderContents = async () => {
    if (!expanded || loading) return;
    
    try {
      setLoading(true);
      
      // 获取子文件夹
      const subFoldersResponse = await fetch(`/api/v1/folders/parent/${folder._id}`);
      const subFoldersData = await subFoldersResponse.json();
      
      if (subFoldersData.success) {
        setSubFolders(subFoldersData.data);
      }
      
      // 获取文件夹中的请求
      const requestsResponse = await fetch(`/api/v1/requests/folder/${folder._id}`);
      const requestsData = await requestsResponse.json();
      
      if (requestsData.success) {
        setRequests(requestsData.data);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadFolderContents();
    }
  }, [expanded, folder._id]);

  // 重命名文件夹
  const handleRenameFolder = async () => {
    try {
      const response = await fetch(`/api/v1/folders/${folder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: folderName }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        setShowRenameDialog(false);
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  // 创建新请求
  const handleCreateRequest = async (formData: any) => {
    try {
      const requestData = {
        ...formData,
        collectionId,
        folderId: folder._id,
      };
      
      const response = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRequests(prev => [...prev, data.data]);
        setShowNewRequestDialog(false);
      }
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  // 创建新子文件夹
  const handleCreateSubFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const response = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          collectionId,
          parentId: folder._id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubFolders(prev => [...prev, data.data]);
        setShowNewFolderDialog(false);
        setNewFolderName('');
      }
    } catch (error) {
      console.error('Error creating subfolder:', error);
    }
  };

  // 删除文件夹
  const handleDeleteFolder = async () => {
    try {
      const response = await fetch(`/api/v1/folders/${folder._id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 文件夹已删除，需要通知父组件更新
        setShowDeleteDialog(false);
        // 这里应该通知父组件更新文件夹列表
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
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
          <span className="ml-1 text-sm font-medium">{folder.name}</span>
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
              <span>{t('workspace.tree.newRequest', '新建请求')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              <span>{t('apiTesting.collections.newSubfolder', '新建子文件夹')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              <span>{t('actions.rename', '重命名')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>{t('apiTesting.collections.deleteFolder', '删除文件夹')}</span>
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
              {subFolders.length === 0 && requests.length === 0 ? (
                <div className="py-2 px-2 text-sm text-muted-foreground">
                  {t('apiTesting.collections.emptyFolder', '文件夹为空，创建新请求或子文件夹')}
                </div>
              ) : (
                <>
                  {/* 显示子文件夹 */}
                  {subFolders.map(subFolder => (
                    <FolderItem 
                      key={subFolder._id} 
                      folder={subFolder} 
                      collectionId={collectionId} 
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

      {/* 重命名对话框 */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.renameFolder', '重命名文件夹')}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('apiTesting.collections.folderName', '文件夹名称')}
                </label>
                <Input 
                  className="mt-2" 
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRenameDialog(false)}
                >
                  {t('actions.reset', '取消')}
                </Button>
                <Button 
                  type="button" 
                  onClick={handleRenameFolder}
                  disabled={!folderName.trim()}
                >
                  {t('actions.save', '保存')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新建请求对话框 */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('workspace.tree.newRequest', '新建请求')}</DialogTitle>
          </DialogHeader>
          <RequestForm 
            onSubmit={handleCreateRequest}
            onCancel={() => setShowNewRequestDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 新建子文件夹对话框 */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.newSubfolder', '新建子文件夹')}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('apiTesting.collections.folderName', '文件夹名称')}
                </label>
                <Input 
                  className="mt-2" 
                  placeholder={t('apiTesting.collections.folderNamePlaceholder', '输入文件夹名称')} 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
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
                  onClick={handleCreateSubFolder}
                  disabled={!newFolderName.trim()}
                >
                  {t('actions.create', '创建')}
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
            <AlertDialogTitle>{t('dialog.confirmDelete', '确认删除')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('apiTesting.collections.confirmDeleteFolder', '您确定要删除该文件夹吗？此操作将删除所有子文件夹和请求，且无法恢复。')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.reset', '取消')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-red-600 text-white hover:bg-red-700">
              {t('actions.delete', '删除')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
