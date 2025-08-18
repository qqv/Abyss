import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Collection } from '@/models/Collection';
import { Environment } from '@/models/Environment';
import { Proxy } from '@/models/Proxy';
import { TestJob } from '@/models/TestJob';
import { LogManager } from '@/lib/log-manager';
import { LogMiddleware } from '@/lib/log-middleware';

export async function POST(request: NextRequest) {
  try {
    const { type, format = 'json' } = await request.json();
    
    await connectMongoDB();
    
    LogMiddleware.logInfo('data-export', `开始导出数据: ${type}`, { type, format });

    let exportData: any = {};
    const timestamp = new Date().toISOString();

    switch (type) {
      case 'all':
        // 导出所有数据
        const [collections, environments, testResults, proxies] = await Promise.all([
          Collection.find().lean(),
          Environment.find().lean(),
          TestJob.find().lean(),
          Proxy.find().lean()
        ]);
        
        exportData = {
          metadata: {
            exportDate: timestamp,
            exportType: 'all',
            version: '1.0.0'
          },
          collections,
          environments,
          testResults,
          proxyConfigs: proxies
        };
        break;

      case 'collections':
        const collectionsData = await Collection.find().lean();
        exportData = {
          metadata: {
            exportDate: timestamp,
            exportType: 'collections',
            version: '1.0.0'
          },
          collections: collectionsData
        };
        break;

      case 'environments':
        const environmentsData = await Environment.find().lean();
        exportData = {
          metadata: {
            exportDate: timestamp,
            exportType: 'environments',
            version: '1.0.0'
          },
          environments: environmentsData
        };
        break;

      case 'results':
        const resultsData = await TestJob.find().lean();
        exportData = {
          metadata: {
            exportDate: timestamp,
            exportType: 'results',
            version: '1.0.0'
          },
          testResults: resultsData
        };
        break;

      case 'proxies':
        const proxiesData = await Proxy.find().lean();
        exportData = {
          metadata: {
            exportDate: timestamp,
            exportType: 'proxies',
            version: '1.0.0'
          },
          proxyConfigs: proxiesData
        };
        break;

      case 'logs':
        const logManager = LogManager.getInstance();
        const logs = await logManager.getLogs({});
        exportData = {
          metadata: {
            exportDate: timestamp,
            exportType: 'logs',
            version: '1.0.0'
          },
          logs: logs.logs
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid export type' },
          { status: 400 }
        );
    }

    // 根据格式处理数据
    let responseData: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'json':
        responseData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;

      case 'csv':
        // 对于CSV格式，我们需要将嵌套对象扁平化
        responseData = convertToCSV(exportData);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;

      default:
        responseData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
    }

    const fileName = `abyss-${type}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    LogMiddleware.logInfo('data-export', `数据导出完成: ${type}`, { 
      type, 
      format, 
      fileName,
      dataSize: responseData.length 
    });

    // 返回文件数据
    return new NextResponse(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': responseData.length.toString()
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    LogMiddleware.logError('data-export', '数据导出失败', { error: error instanceof Error ? error.message : String(error) });
    
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

// 将对象转换为CSV格式的辅助函数
function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const rows: string[] = [];
  
  // 处理metadata
  if (data.metadata) {
    rows.push('=== METADATA ===');
    rows.push('Key,Value');
    Object.entries(data.metadata).forEach(([key, value]) => {
      rows.push(`"${key}","${value}"`);
    });
    rows.push('');
  }

  // 处理各种数据类型
  for (const [key, value] of Object.entries(data)) {
    if (key === 'metadata') continue;
    
    if (Array.isArray(value) && value.length > 0) {
      rows.push(`=== ${key.toUpperCase()} ===`);
      
      // 获取所有可能的键
      const allKeys = new Set<string>();
      value.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(flattenObject(item)).forEach(k => allKeys.add(k));
        }
      });
      
      const headers = Array.from(allKeys);
      if (headers.length > 0) {
        rows.push(headers.map(h => `"${h}"`).join(','));
        
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            const flattened = flattenObject(item);
            const row = headers.map(header => {
              const val = flattened[header] ?? '';
              return `"${String(val).replace(/"/g, '""')}"`;
            });
            rows.push(row.join(','));
          }
        });
      }
      rows.push('');
    }
  }

  return rows.join('\n');
}

// 扁平化嵌套对象的辅助函数
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}
