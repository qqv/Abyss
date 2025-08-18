import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Edit, Trash2, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RequestForm } from './RequestForm';
import RequestPanel from './RequestPanel';
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

// HTTP方法对应的颜色
const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
  HEAD: 'bg-slate-100 text-slate-700',
  OPTIONS: 'bg-cyan-100 text-cyan-700',
};

interface Request {
  _id: string;
  name: string;
  method: string;
  url: string;
  folderId: string | null;
  collectionId: string;
  order: number;
}

interface RequestItemProps {
  request: Request;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export const RequestItem = ({ request, onDelete, onDuplicate }: RequestItemProps) => {
  const { t } = useTranslation('common');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRequestPanel, setShowRequestPanel] = useState(false);

  // 处理编辑请求
  const handleEditRequest = async (formData: any) => {
    try {
      const response = await fetch(`/api/v1/requests/${request._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowEditDialog(false);
        // 这里应该通知父组件更新请求列表
      }
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  // 处理删除请求
  const handleDeleteRequest = async () => {
    try {
      const response = await fetch(`/api/v1/requests/${request._id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setShowDeleteDialog(false);
        if (onDelete) {
          onDelete(request._id);
        }
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  // 处理复制请求
  const handleDuplicateRequest = async () => {
    try {
      const response = await fetch(`/api/v1/requests/${request._id}/duplicate`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success && onDuplicate) {
        onDuplicate(data.data._id);
      }
    } catch (error) {
      console.error('Error duplicating request:', error);
    }
  };

  // 获取方法显示样式
  const getMethodClass = (method: string) => {
    return methodColors[method] || 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <div 
        className="flex items-center justify-between px-2 py-1 ml-5 rounded-md hover:bg-secondary/50 cursor-pointer"
        onClick={() => setShowRequestPanel(true)}
      >
        <div className="flex items-center flex-1">
          <div className={`px-2 py-0.5 text-xs font-medium rounded mr-2 ${getMethodClass(request.method)}`}>
            {request.method}
          </div>
          <span className="text-sm truncate">{request.name}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowRequestPanel(true); }}>
              <Play className="h-4 w-4 mr-2" />
              <span>{t('actions.run', '运行')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}>
              <Edit className="h-4 w-4 mr-2" />
              <span>{t('actions.edit', '编辑')}</span>
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateRequest(); }}>
                <Copy className="h-4 w-4 mr-2" />
                <span>{t('actions.copy', '复制')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>{t('actions.delete', '删除')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 编辑请求对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('apiTesting.request.edit', '编辑请求')}</DialogTitle>
          </DialogHeader>
          <RequestForm 
            initialData={{
              name: request.name,
              method: request.method,
              url: request.url,
              // 其他字段会从服务器获取
            }}
            requestId={request._id}
            onSubmit={handleEditRequest}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.confirmDelete', '确认删除')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('apiTesting.request.confirmDelete', '您确定要删除该请求吗？此操作无法恢复。')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.reset', '取消')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-red-600 text-white hover:bg-red-700">
              {t('actions.delete', '删除')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 请求面板 */}
      <Dialog open={showRequestPanel} onOpenChange={setShowRequestPanel} modal={false}>
        <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh]">
          <RequestPanel requestId={request._id} />
        </DialogContent>
      </Dialog>
    </>
  );
};
