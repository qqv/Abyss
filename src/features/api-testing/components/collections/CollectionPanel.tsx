'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreVertical, Plus, FolderPlus, FolderEdit, Trash2, FileText, Play } from 'lucide-react';
import { RequestForm } from './RequestForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

// 集合面板组件的属性接口
interface CollectionPanelProps {
  collections: any[];
  onSelectRequest: (requestId: string) => void;
}

// 集合面板组件
const CollectionPanel: React.FC<CollectionPanelProps> = ({ collections, onSelectRequest }) => {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'collection' | 'request' } | null>(null);

  // 过滤集合和请求
  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 切换集合展开/折叠状态
  const toggleCollection = (collectionId: string) => {
    setExpandedCollections(prev => ({
      ...prev,
      [collectionId]: !prev[collectionId]
    }));
  };

  // 创建新集合
  const handleCreateCollection = async (data: any) => {
    // 这里将来需要实际的API调用来创建集合
    console.log('创建新集合:', data);
    setShowNewCollection(false);
  };

  // 创建新请求
  const handleCreateRequest = async (data: any) => {
    // 这里将来需要实际的API调用来创建请求
    console.log('创建新请求:', data, '集合ID:', selectedCollection?.id);
    setShowNewRequest(false);
  };

  // 处理删除操作
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      // 这里将来需要实际的API调用来删除集合或请求
      console.log(`删除${itemToDelete.type === 'collection' ? '集合' : '请求'}:`, itemToDelete.id);
      
      // 成功后关闭对话框
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('删除操作失败:', error);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 搜索和创建按钮 */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder={t('apiTesting.collections.searchPlaceholder', '搜索集合和请求...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <svg 
            className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        <Button onClick={() => setShowNewCollection(true)}>
          <FolderPlus className="h-4 w-4 mr-2" />
          {t('apiTesting.collections.new', '新建')}
        </Button>
      </div>

      {/* 集合列表 */}
      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>{t('apiTesting.collections.title', 'API集合')}</CardTitle>
          <CardDescription>
            {t('apiTesting.collections.subtitle', '管理您的API请求集合')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {filteredCollections.length > 0 ? (
              <div className="space-y-4">
                {filteredCollections.map((collection) => (
                  <div key={collection.id} className="border rounded-md overflow-hidden">
                    <div 
                      className="flex justify-between items-center p-3 bg-muted/50 cursor-pointer"
                      onClick={() => toggleCollection(collection.id)}
                    >
                      <div className="font-medium">{collection.name}</div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCollection(collection);
                            setShowNewRequest(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setItemToDelete({ id: collection.id, type: 'collection' });
                              setShowDeleteDialog(true);
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" /> {t('apiTesting.collections.deleteCollection', '删除集合')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FolderEdit className="h-4 w-4 mr-2" /> {t('apiTesting.collections.editCollection', '编辑集合')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {expandedCollections[collection.id] && collection.requests && (
                      <div className="p-2 space-y-1">
                        {collection.requests.map((request: any) => (
                          <div 
                            key={request.id} 
                            className="flex justify-between items-center rounded-md px-3 py-2 hover:bg-muted cursor-pointer"
                            onClick={() => onSelectRequest(request.id)}
                          >
                            <div className="flex items-center">
                              <div className={`w-16 text-xs font-semibold px-2 py-1 rounded mr-2 ${
                                request.method === 'GET' ? 'bg-green-100 text-green-800' :
                                request.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                request.method === 'PUT' ? 'bg-amber-100 text-amber-800' :
                                request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {request.method}
                              </div>
                              <span>{request.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 这里将来可以实现运行请求的功能
                                  console.log(t('apiTesting.collections.runRequestLog', '运行请求:'), request.id);
                                }}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToDelete({ id: request.id, type: 'request' });
                                    setShowDeleteDialog(true);
                                  }}>
                                    <Trash2 className="h-4 w-4 mr-2" /> {t('apiTesting.collections.deleteRequest', '删除请求')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                        {(!collection.requests || collection.requests.length === 0) && (
                          <div className="text-center text-muted-foreground py-4">
                            {t('apiTesting.collections.noRequests', '此集合中没有请求。点击 + 按钮添加请求。')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                {searchTerm ? t('apiTesting.collections.noMatch', '没有找到匹配的集合') : t('apiTesting.collections.noCollectionsTip', '暂无集合。点击"新建集合"按钮创建一个集合。')}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 创建集合对话框 */}
      <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.createDialogTitle', '创建新集合')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="collection-name" className="text-sm font-medium">
                {t('apiTesting.collections.name', '集合名称')}
              </label>
              <Input id="collection-name" placeholder={t('apiTesting.collections.namePlaceholder', '输入集合名称')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="collection-description" className="text-sm font-medium">
                {t('apiTesting.collections.desc', '描述')}
              </label>
              <Input id="collection-description" placeholder={t('apiTesting.collections.descPlaceholder', '输入集合描述(可选)')} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowNewCollection(false)}>
              {t('actions.reset', '取消')}
            </Button>
            <Button onClick={() => handleCreateCollection({ name: 'New Collection' })}>
              {t('sidebar.dialog.create', '创建')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建请求对话框 */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.createRequestTitle', '新建请求')}</DialogTitle>
          </DialogHeader>
          <RequestForm 
            onSubmit={handleCreateRequest} 
            onCancel={() => setShowNewRequest(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('workspace.tree.confirmDeleteGeneric', '确定要删除此项吗？此操作无法撤销。')}</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'collection' 
                ? t('workspace.tree.confirmDeleteCollection', '确定要删除集合 "{{name}}" 吗？这将删除所有关联的请求和文件夹。', { name: '' }) 
                : t('workspace.tree.confirmDeleteRequest', '确定要删除请求 "{{name}}" 吗？此操作无法撤销。', { name: '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.reset', '取消')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('workspace.tree.delete', '删除')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollectionPanel;
