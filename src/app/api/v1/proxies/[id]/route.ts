import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';
import mongoose from 'mongoose';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取单个代理详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 从路由参数中提取ID
    const { id } = await params;
    
    // 处理特殊路由 "stats"
    if (id === 'stats') {
      await connectMongoDB();
      // 获取代理统计信息
      const totalCount = await Proxy.countDocuments();
      const activeCount = await Proxy.countDocuments({ isActive: true });
      const inactiveCount = await Proxy.countDocuments({ isActive: false });
      
      return NextResponse.json({
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount
      });
    }
    
    // 验证ID是否为有效的MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: '无效的代理ID格式' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    const proxy = await Proxy.findById(id).lean();
    
    if (!proxy) {
      return NextResponse.json(
        { error: '未找到代理' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(proxy);
  } catch (error) {
    // 提取错误时避免再次使用 params.id 防止异步问题
    let errorId = '未知';
    try {
      const { id } = await params;
      errorId = id || '未知';
    } catch (e) {
      // 忽略错误
    }
    console.error(`获取代理 ${errorId} 失败:`, error);
    return NextResponse.json(
      { error: '获取代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 更新代理
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // 验证ID是否为有效的MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: '无效的代理ID格式' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    await connectMongoDB();
    
    // 验证必要字段
    if (!body.host || !body.port || !body.protocol) {
      return NextResponse.json(
        { error: '缺少必要字段：host, port, protocol' },
        { status: 400 }
      );
    }
    
    const updatedProxy = await Proxy.findByIdAndUpdate(
      id,
      {
        host: body.host,
        port: body.port,
        protocol: body.protocol,
        username: body.username,
        password: body.password,
        isActive: body.isActive !== undefined ? body.isActive : true,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedProxy) {
      return NextResponse.json(
        { error: '未找到要更新的代理' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedProxy);
  } catch (error) {
    // 提取错误时避免再次使用 params.id 防止异步问题
    let errorId = '未知';
    try {
      const { id } = await params;
      errorId = id || '未知';
    } catch (e) {
      // 忽略错误
    }
    console.error(`更新代理 ${errorId} 失败:`, error);
    return NextResponse.json(
      { error: '更新代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 删除代理
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // 验证ID是否为有效的MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: '无效的代理ID格式' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    const proxy = await Proxy.findByIdAndDelete(id);
    
    if (!proxy) {
      return NextResponse.json(
        { error: '未找到要删除的代理' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: '代理已成功删除' },
      { status: 200 }
    );
  } catch (error) {
    // 提取错误时避免再次使用 params.id 防止异步问题
    let errorId = '未知';
    try {
      const { id } = await params;
      errorId = id || '未知';
    } catch (e) {
      // 忽略错误
    }
    console.error(`删除代理 ${errorId} 失败:`, error);
    return NextResponse.json(
      { error: '删除代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
