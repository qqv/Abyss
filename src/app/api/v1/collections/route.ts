import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Collection } from '@/models/Collection';
import { LogMiddleware } from '@/lib/log-middleware';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取所有API集合
export async function GET() {
  try {
    await connectMongoDB();
    const collections = await Collection.find({}).sort({ name: 1 }).lean();
    
    // 记录成功日志
    await LogMiddleware.logInfo('api', `获取API集合列表成功，共 ${collections.length} 个集合`, {
      action: 'list_collections',
      count: collections.length,
      endpoint: '/api/v1/collections'
    });
    
    return NextResponse.json(collections);
  } catch (error) {
    // 记录错误日志
    await LogMiddleware.logError('api', error as Error, {
      action: 'list_collections',
      endpoint: '/api/v1/collections'
    });
    
    console.error('获取API集合失败:', error);
    return NextResponse.json(
      { error: '获取API集合失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新API集合
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证必要字段
    if (!body.name) {
      await LogMiddleware.logWarning('api', '创建API集合失败：缺少必要字段', {
        action: 'create_collection',
        error: '缺少必要字段：name',
        provided_fields: Object.keys(body)
      });
      
      return NextResponse.json(
        { error: '缺少必要字段：name' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 生成唯一ID作为自定义id字段
    const customId = body.id || require('uuid').v4();
    
    // 创建API集合，不显式设置_id，让MongoDB自动生成
    const collection = new Collection({
      name: body.name,
      description: body.description || '',
      folders: body.folders || [],
      requests: body.requests || [],
      id: customId,  // 设置自定义id字段
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 保存后，MongoDB会自动生成_id
    await collection.save();
    
    // 记录成功日志
    await LogMiddleware.logInfo('api', `API集合创建成功：${body.name}`, {
      action: 'create_collection',
      collection_id: collection._id,
      collection_name: body.name,
      custom_id: customId,
      has_description: !!(body.description),
      folders_count: (body.folders || []).length,
      requests_count: (body.requests || []).length
    });
    
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    // 记录错误日志
    await LogMiddleware.logError('api', error as Error, {
      action: 'create_collection',
      endpoint: '/api/v1/collections',
      collection_name: body?.name,
      request_body: body
    });
    
    console.error('创建API集合失败:', error);
    return NextResponse.json(
      { error: '创建API集合失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
