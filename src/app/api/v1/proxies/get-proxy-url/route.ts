/**
 * 代理URL格式化API端点
 * 此API返回一个格式化的代理URL，供前端使用
 * 前端无需直接导入代理相关模块
 */
import { formatProxyUrl } from '@/app/api/services/server-request-service';
import { NextResponse } from 'next/server';

export interface ProxyUrlRequest {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body: ProxyUrlRequest = await request.json();
    
    // 格式化代理URL
    const proxyUrl = formatProxyUrl(body);
    
    if (!proxyUrl) {
      return NextResponse.json({ 
        success: false, 
        error: '无效的代理配置' 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      proxyUrl
    });
  } catch (error) {
    console.error('格式化代理URL失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '处理请求失败' 
    }, { status: 500 });
  }
}
