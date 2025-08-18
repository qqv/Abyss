/**
 * 代理池批量操作服务
 * 负责处理批量导入和批量测试代理
 */

import { Proxy } from '../types';
import { testProxy } from '@/lib/proxy-test-service';

// 批量导入代理
export async function bulkImportProxies(
  proxies: Array<{
    protocol: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  }>
): Promise<{ success: number; failed: number }> {
  try {
    const response = await fetch('/api/v1/proxies/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proxies }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `批量导入代理失败: ${response.status} ${errorData.message || response.statusText}`
      );
    }

    const result = await response.json();
    return {
      success: result.success || 0,
      failed: result.failed || 0
    };
  } catch (error) {
    console.error('批量导入代理失败:', error);
    throw error;
  }
}

// 从URL导入代理
export async function importProxiesFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch('/api/v1/proxies/import-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `从URL导入代理失败: ${response.status} ${errorData.message || response.statusText}`
      );
    }

    const result = await response.json();
    return result.content || '';
  } catch (error) {
    console.error('从URL导入代理失败:', error);
    throw error;
  }
}

// 测试单个代理
export async function testSingleProxy(proxyId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/proxies/${proxyId}/test`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`测试代理失败: ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('测试代理失败:', error);
    throw error;
  }
}

// 批量测试代理
export async function bulkTestProxies(
  proxyIds?: string[]
): Promise<{ total: number; valid: number; invalid: number }> {
  try {
    const response = await fetch('/api/v1/proxies/bulk-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proxyIds }),
    });

    if (!response.ok) {
      throw new Error(`批量测试代理失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('批量测试代理失败:', error);
    throw error;
  }
}
