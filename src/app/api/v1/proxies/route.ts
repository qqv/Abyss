import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';
import { LogMiddleware } from '@/lib/log-middleware';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取所有代理
export async function GET() {
  try {
    await connectMongoDB();
    const proxies = await Proxy.find({}).sort({ host: 1 }).lean();
    
    // 记录日志
    await LogMiddleware.logInfo('proxy', `获取代理列表成功，共 ${proxies.length} 个代理`, {
      count: proxies.length,
      action: 'list_proxies'
    });
    
    return NextResponse.json(proxies);
  } catch (error) {
    // 记录错误日志
    await LogMiddleware.logError('proxy', error as Error, {
      action: 'list_proxies',
      endpoint: '/api/v1/proxies'
    });
    
    console.error('获取代理列表失败:', error);
    return NextResponse.json(
      { error: '获取代理列表失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新代理
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证必要字段
    if (!body.host || !body.port || !body.protocol) {
      await LogMiddleware.logWarning('proxy', '创建代理失败：缺少必要字段', {
        action: 'create_proxy',
        provided_fields: Object.keys(body),
        missing_fields: ['host', 'port', 'protocol'].filter(field => !body[field])
      });
      
      return NextResponse.json(
        { error: '缺少必要字段：host, port, protocol' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 检查代理是否已存在
    const existingProxy = await Proxy.findOne({
      host: body.host,
      port: body.port,
      protocol: body.protocol
    });
    
    if (existingProxy) {
      await LogMiddleware.logWarning('proxy', '创建代理失败：代理已存在', {
        action: 'create_proxy',
        proxy: `${body.host}:${body.port}`,
        protocol: body.protocol,
        existing_id: existingProxy._id
      });
      
      return NextResponse.json(
        { error: '代理已存在' },
        { status: 409 }
      );
    }
    
    // 创建新代理
    const proxy = new Proxy({
      host: body.host,
      port: body.port,
      protocol: body.protocol,
      username: body.username,
      password: body.password,
      isActive: true,
      isValid: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await proxy.save();
    
    // 记录成功日志
    await LogMiddleware.logInfo('proxy', `代理创建成功：${body.host}:${body.port}`, {
      action: 'create_proxy',
      proxy_id: proxy._id,
      proxy: `${body.host}:${body.port}`,
      protocol: body.protocol,
      has_auth: !!(body.username && body.password)
    });
    
    return NextResponse.json(proxy, { status: 201 });
  } catch (error) {
    // 记录错误日志
    await LogMiddleware.logError('proxy', error as Error, {
      action: 'create_proxy',
      endpoint: '/api/v1/proxies',
      request_body: body
    });
    
    console.error('创建代理失败:', error);
    return NextResponse.json(
      { error: '创建代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
