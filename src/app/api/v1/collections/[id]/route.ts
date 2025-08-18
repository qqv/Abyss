import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Collection } from '@/models/Collection';
import mongoose from 'mongoose';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 辅助函数：判断是否为有效的ObjectId格式
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
}

// 辅助函数：构建查询条件
function buildQueryCondition(id: string) {
  if (isValidObjectId(id)) {
    // 如果是有效的ObjectId格式，使用findById
    return { useObjectId: true, query: id };
  } else {
    // 如果是UUID或其他格式，使用findOne查询id字段
    return { useObjectId: false, query: { id: id } };
  }
}

// 获取单个API集合详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await connectMongoDB();
    
    const queryCondition = buildQueryCondition(id);
    let collection;
    
    if (queryCondition.useObjectId) {
      collection = await Collection.findById(queryCondition.query as string).lean();
    } else {
      collection = await Collection.findOne(queryCondition.query as { id: string }).lean();
    }
    
    if (!collection) {
      return NextResponse.json(
        { error: '未找到API集合' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(collection);
  } catch (error) {
    console.error(`获取API集合 ${(await params).id} 失败:`, error);
    return NextResponse.json(
      { error: '获取API集合失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 更新API集合
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    await connectMongoDB();
    
    // 验证必要字段
    if (!body.name) {
      return NextResponse.json(
        { error: '缺少必要字段：name' },
        { status: 400 }
      );
    }
    
    // 打印请求详情方便调试
    console.log('更新集合详细信息:', {
      id,
      requestsCount: body.requests?.length || 0,
      requestsSample: body.requests && body.requests.length > 0 ? 
        `第一个请求: ${JSON.stringify({...body.requests[0], auth: body.requests[0].auth})}` : '无请求'
    });
    
    // 使用完整的请求体更新，保留所有字段
    const updateData = {
      ...body,  // 保留请求体中的所有字段
      updatedAt: new Date()
    };
    
    // 移除不应该更新的字段
    delete updateData._id;
    delete updateData.id;
    delete updateData.createdAt;
    
    const queryCondition = buildQueryCondition(id);
    let updatedCollection;
    
    if (queryCondition.useObjectId) {
      updatedCollection = await Collection.findByIdAndUpdate(
        queryCondition.query as string,
        updateData,
        { new: true }
      );
    } else {
      updatedCollection = await Collection.findOneAndUpdate(
        queryCondition.query as { id: string },
        updateData,
        { new: true }
      );
    }
    
    if (!updatedCollection) {
      return NextResponse.json(
        { error: '未找到要更新的API集合' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedCollection);
  } catch (error) {
    console.error(`更新API集合 ${(await params).id} 失败:`, error);
    return NextResponse.json(
      { error: '更新API集合失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 删除API集合
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await connectMongoDB();
    
    const queryCondition = buildQueryCondition(id);
    let collection;
    
    if (queryCondition.useObjectId) {
      collection = await Collection.findByIdAndDelete(queryCondition.query as string);
    } else {
      collection = await Collection.findOneAndDelete(queryCondition.query as { id: string });
    }
    
    if (!collection) {
      return NextResponse.json(
        { error: '未找到要删除的API集合' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'API集合已成功删除' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`删除API集合 ${(await params).id} 失败:`, error);
    return NextResponse.json(
      { error: '删除API集合失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
