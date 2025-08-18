import { NextResponse } from 'next/server';

/**
 * 从外部URL获取代理列表
 * @route GET /api/v1/proxies/fetch-external
 */
export async function GET(request: Request) {
  try {
    // 获取URL参数
    const url = new URL(request.url);
    const externalUrl = url.searchParams.get('url');
    
    if (!externalUrl) {
      return NextResponse.json(
        { error: '缺少外部源URL参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    try {
      new URL(externalUrl);
    } catch (error) {
      return NextResponse.json(
        { error: '无效的URL格式' },
        { status: 400 }
      );
    }

    // 从外部URL获取代理列表
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `无法获取外部代理源: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 获取文本内容
    const data = await response.text();

    // 返回原始内容，让前端负责格式化和处理
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('从外部源获取代理失败:', error);
    return NextResponse.json(
      { error: '获取外部代理源时出错' },
      { status: 500 }
    );
  }
}
