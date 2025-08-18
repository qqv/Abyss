import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy, ProxyPoolConfig } from '@/models/Proxy';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取代理池列表
export async function GET() {
  try {
    await connectMongoDB();
    
    // 获取代理列表和代理池配置
    const [proxies, config] = await Promise.all([
      Proxy.find({ isActive: true }).sort({ host: 1 }).lean(),
      ProxyPoolConfig.findOne({}).sort({ updatedAt: -1 }).lean()
    ]);
    
    // 如果没有配置，创建默认配置
    const proxyConfig = config || {
      selectionMode: 'random',
      autoRotationInterval: 300,
      checkProxiesOnStartup: true,
      validateOnFailure: true
    };
    
    // 转换为客户端期望的代理池格式
    const proxyPool = {
      id: 'default-proxy-pool',
      name: '默认代理池',
      proxies: proxies.map(proxy => ({
        id: proxy._id.toString(),
        name: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        username: proxy.username || '',
        password: proxy.password || '',
        enabled: proxy.isActive,
        auth: proxy.username ? {
          username: proxy.username,
          password: proxy.password || ''
        } : undefined
      })),
      mode: proxyConfig.selectionMode === 'sequential' ? 'round-robin' : 
            proxyConfig.selectionMode === 'random' ? 'random' : 'sticky'
    };
    
    return NextResponse.json([proxyPool]);
  } catch (error) {
    console.error('获取代理池失败:', error);
    return NextResponse.json(
      { error: '获取代理池失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 更新代理池配置
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: '代理池ID不能为空' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 更新代理池配置
    // 注意：由于我们使用的是单一代理池模式，所以我们只更新配置，而不是创建新的代理池
    
    // 将客户端模式转换为服务器模式
    let selectionMode = 'random';
    if (data.mode === 'round-robin') selectionMode = 'sequential';
    else if (data.mode === 'random') selectionMode = 'random';
    else if (data.mode === 'sticky') selectionMode = 'custom';
    
    const config = await ProxyPoolConfig.findOne({}).sort({ updatedAt: -1 });
    
    if (config) {
      config.selectionMode = selectionMode;
      config.updatedAt = new Date();
      await config.save();
    } else {
      // 创建默认配置
      const newConfig = new ProxyPoolConfig({
        selectionMode: selectionMode,
        autoRotationInterval: 300,
        checkProxiesOnStartup: true,
        validateOnFailure: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newConfig.save();
    }
    
    // 如果有代理更新，更新代理状态
    if (data.proxies && Array.isArray(data.proxies)) {
      for (const proxyData of data.proxies) {
        if (proxyData.id && typeof proxyData.enabled === 'boolean') {
          await Proxy.findByIdAndUpdate(
            proxyData.id,
            { isActive: proxyData.enabled },
            { new: true }
          );
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新代理池失败:', error);
    return NextResponse.json(
      { error: '更新代理池失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
