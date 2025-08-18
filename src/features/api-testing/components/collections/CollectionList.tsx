import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  PlusCircle, 
  MoreVertical,
  Search,
  Import,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  Plus,
  File as FileIcon,
  Ellipsis
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { CollectionItem } from './CollectionItem';
import { CollectionForm } from './CollectionForm';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface Collection {
  _id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CollectionList = () => {
  const { t } = useTranslation('common');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);

  useEffect(() => {
    // Fetch collections
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/collections');
        
        if (!response.ok) {
          throw new Error(t('apiTesting.collections.fetchFailed', '获取集合失败: {{status}}', { status: response.status }));
        }
        
        // API直接返回集合数组，不是{success:true,data:[]}格式
        const collections = await response.json();
        console.log(t('apiTesting.collections.fetchLog', '获取到集合数据:'), collections);
        setCollections(collections);
      } catch (error) {
      console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // Filter collections based on search query
  const filteredCollections = collections.filter(collection => 
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle creating a new collection
  const handleCreateCollection = async (newCollection: { name: string; description?: string; isPublic: boolean; }) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCollection),
      });

      if (!response.ok) {
          throw new Error(t('apiTesting.collections.createFailed', '创建集合失败'));
      }

      const result = await response.json();
      setCollections([...collections, result]);
      setShowNewCollectionDialog(false);
      toast({
        title: t('apiTesting.collections.createSuccessTitle', '成功'),
        description: t('apiTesting.collections.createSuccessDesc', '集合已创建'),
      });
    } catch (error) {
      console.error(t('apiTesting.collections.createErrorLog', '创建集合错误:'), error);
      toast({
        variant: 'destructive',
        title: t('apiTesting.collections.error', '错误'),
        description: t('apiTesting.collections.createFailedWithMsg', '创建集合失败: {{msg}}', { msg: error instanceof Error ? error.message : t('proxyPool.common.unknown', '未知错误') }),
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle importing collection (placeholder)
  const handleImportCollection = () => {
    // Will be implemented with file upload functionality
    console.log('Import collection clicked');
  };

  return (
    <div className="flex grow basis-0 flex-col overflow-auto h-full" style={{ flex: collapsed ? '5 1 0px' : '30 1 0px', overflow: 'hidden' }}>
      <div className="h-full flex flex-col">
        <div className="p-2 border-b flex justify-between items-center">
          <Input 
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-sm flex-1 mr-2"
            placeholder={t('apiTesting.collections.searchPlaceholder', '搜索集合和请求...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="inline-flex items-center justify-center gap-1 h-9 px-3">
                  <Import className="h-4 w-4" />
                  {t('apiTesting.collections.import', '导入集合')}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImportCollection}>
                  <Import className="h-4 w-4 mr-2" />
                  {t('apiTesting.collections.import', '导入集合')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm"
              className="inline-flex items-center justify-center h-9 px-3"
              onClick={() => setShowNewCollectionDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('apiTesting.collections.new', '新建')}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="ml-1 h-8 w-8 p-0 opacity-80 hover:opacity-100"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? t('apiTesting.collections.expand', '展开集合列表') : t('apiTesting.collections.collapse', '折叠集合列表')}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-muted-foreground">{t('proxyPool.common.loading', '加载中...')}</span>
            </div>
          ) : filteredCollections.length > 0 ? (
            <div>
              {filteredCollections.map(collection => (
                <div key={collection._id} className="mb-2">
                  <div className="flex items-center py-1 px-2 text-sm rounded-sm cursor-pointer bg-blue-100 dark:bg-blue-900">
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Database className="h-4 w-4 mr-2 text-purple-500" />
                    <span className="truncate font-medium">{collection.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="ml-4 mt-1">
                    {/* 示例请求项 - 在实际集合实现中需要从集合中加载真实请求 */}
                    <div>
                      <div className="flex items-center py-1 px-2 text-sm rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ paddingLeft: 0 }}>
                        <FileIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="truncate">{t('apiTesting.collections.exampleRequest', '示例请求')}</span>
                        <span className="ml-auto text-xs font-mono text-gray-500">GET</span>
                        <Button variant="ghost" size="icon" className="rounded-md ml-1 h-6 w-6 p-0 opacity-50 hover:opacity-100">
                          <Ellipsis className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t('apiTesting.collections.noMatch', '没有找到匹配的集合') : t('apiTesting.empty.noCollections', '没有可用的API集合')}
              </p>
              {!searchQuery && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewCollectionDialog(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('apiTesting.collections.createFirst', '创建第一个集合')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 创建新集合的对话框 */}
      <Dialog open={showNewCollectionDialog} onOpenChange={setShowNewCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiTesting.collections.createDialogTitle', '创建新集合')}</DialogTitle>
          </DialogHeader>
          <CollectionForm onSubmit={handleCreateCollection} onCancel={() => setShowNewCollectionDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
