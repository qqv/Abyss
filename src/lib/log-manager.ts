import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'api' | 'proxy' | 'system';
  message: string;
  details?: any;
}

export interface LogsSettings {
  enableApiLogs: boolean;
  enableProxyLogs: boolean;
  enableSystemLogs: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  maxLogSize: number; // MB
}

export interface LogFilter {
  search?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  category?: 'api' | 'proxy' | 'system';
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface LogResult {
  logs: LogEntry[];
  total: number;
}

export class LogManager {
  private static instance: LogManager;
  private logsDir: string;
  private settingsFile: string;
  private currentLogFile: string;
  private settings: LogsSettings;
  private static globalRequestLoggingEnabled: boolean = false; // 全局请求日志开关，默认关闭
  private initializationComplete: boolean = false; // 初始化完成标志

  private constructor() {
    // 在生产环境中，日志应该存储在应用数据目录
    // 在开发环境中，我们使用项目根目录下的logs文件夹
    this.logsDir = path.join(process.cwd(), 'logs');
    this.settingsFile = path.join(this.logsDir, 'settings.json');
    this.currentLogFile = path.join(this.logsDir, `app-${this.getCurrentDateString()}.log`);
    
    // 默认设置 - 修改为关闭所有日志，防止未初始化时的日志记录
    this.settings = {
      enableApiLogs: false,
      enableProxyLogs: false,
      enableSystemLogs: false,
      logLevel: 'info',
      retentionDays: 30,
      maxLogSize: 100
    };

    this.init();
  }

  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  private async init() {
    try {
      // 确保日志目录存在
      await fs.mkdir(this.logsDir, { recursive: true });
      
      // 加载设置
      await this.loadSettings();
      
      // 清理过期日志
      await this.cleanupOldLogs();
      
      // 标记初始化完成
      this.initializationComplete = true;
    } catch (error) {
      console.error('初始化日志管理器失败:', error);
      // 即使初始化失败，也标记完成，避免永远阻塞
      this.initializationComplete = true;
    }
  }

  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private async loadSettings() {
    try {
      const settingsData = await fs.readFile(this.settingsFile, 'utf-8');
      this.settings = { ...this.settings, ...JSON.parse(settingsData) };
      
      // 根据加载的设置更新全局开关 - 如果所有日志都关闭，则关闭全局开关
      const allLogsDisabled = !this.settings.enableApiLogs && 
                             !this.settings.enableProxyLogs && 
                             !this.settings.enableSystemLogs;
      LogManager.globalRequestLoggingEnabled = !allLogsDisabled;
    } catch (error) {
      // 设置文件不存在，保持默认设置（所有日志关闭）
      // 不自动创建设置文件，让用户主动配置
      console.log('日志设置文件不存在，使用默认设置（所有日志关闭）');
    }
  }

  private async saveSettings() {
    try {
      await fs.writeFile(this.settingsFile, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('保存日志设置失败:', error);
    }
  }

  private shouldLog(level: string, category: string): boolean {
    // 首先检查是否已完成初始化
    if (!this.initializationComplete) {
      return false;
    }

    // 检查全局请求日志记录开关
    if (!LogManager.globalRequestLoggingEnabled) {
      return false;
    }

    // 检查该类别的日志是否启用
    switch (category) {
      case 'api':
        if (!this.settings.enableApiLogs) return false;
        break;
      case 'proxy':
        if (!this.settings.enableProxyLogs) return false;
        break;
      case 'system':
        if (!this.settings.enableSystemLogs) return false;
        break;
    }

    // 检查日志级别
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.settings.logLevel);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= currentLevelIndex;
  }

  // 静态方法：设置全局请求日志记录开关
  static setGlobalRequestLogging(enabled: boolean) {
    LogManager.globalRequestLoggingEnabled = enabled;
  }

  // 静态方法：获取全局请求日志记录开关状态
  static isGlobalRequestLoggingEnabled(): boolean {
    return LogManager.globalRequestLoggingEnabled;
  }

  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    if (!this.shouldLog(entry.level, entry.category)) {
      return;
    }

    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    try {
      // 检查当前日志文件大小
      await this.rotateLogIfNeeded();
      
      // 写入日志
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine);
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  private async rotateLogIfNeeded() {
    try {
      const stats = await fs.stat(this.currentLogFile);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > this.settings.maxLogSize) {
        // 创建新的日志文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = path.join(this.logsDir, `app-${timestamp}.log`);
        await fs.rename(this.currentLogFile, rotatedFile);
        
        // 更新当前日志文件
        this.currentLogFile = path.join(this.logsDir, `app-${this.getCurrentDateString()}.log`);
      }
    } catch (error) {
      // 文件不存在或其他错误，忽略
    }
  }

  async getLogs(filter: LogFilter = {}): Promise<LogResult> {
    const {
      search = '',
      level,
      category,
      page = 1,
      limit = 50,
      startDate,
      endDate
    } = filter;

    try {
      // 获取所有日志文件
      const files = await fs.readdir(this.logsDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      const allLogs: LogEntry[] = [];
      
      // 读取所有日志文件
      for (const file of logFiles) {
        const filePath = path.join(this.logsDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n').filter(line => line);
          
          for (const line of lines) {
            try {
              const log = JSON.parse(line);
              allLogs.push(log);
            } catch (parseError) {
              // 忽略解析错误的行
            }
          }
        } catch (readError) {
          console.error(`读取日志文件失败: ${file}`, readError);
        }
      }

      // 应用过滤器
      let filteredLogs = allLogs;

      if (search) {
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(search.toLowerCase()) ||
          JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase())
        );
      }

      if (level) {
        filteredLogs = filteredLogs.filter(log => log.level === level);
      }

      if (category) {
        filteredLogs = filteredLogs.filter(log => log.category === category);
      }

      if (startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= new Date(endDate)
        );
      }

      // 按时间戳倒序排序
      filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // 分页
      const total = filteredLogs.length;
      const startIndex = (page - 1) * limit;
      const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

      return {
        logs: paginatedLogs,
        total
      };
    } catch (error) {
      console.error('获取日志失败:', error);
      return { logs: [], total: 0 };
    }
  }

  async clearLogs() {
    try {
      const files = await fs.readdir(this.logsDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      for (const file of logFiles) {
        const filePath = path.join(this.logsDir, file);
        await fs.unlink(filePath);
      }
      
      // 重新创建当前日志文件
      this.currentLogFile = path.join(this.logsDir, `app-${this.getCurrentDateString()}.log`);
    } catch (error) {
      console.error('清理日志失败:', error);
      throw error;
    }
  }

  async getSettings(): Promise<LogsSettings> {
    return { ...this.settings };
  }

  async updateSettings(newSettings: LogsSettings) {
    this.settings = { ...newSettings };
    
    // 根据新设置更新全局开关
    const allLogsDisabled = !this.settings.enableApiLogs && 
                           !this.settings.enableProxyLogs && 
                           !this.settings.enableSystemLogs;
    LogManager.globalRequestLoggingEnabled = !allLogsDisabled;
    
    await this.saveSettings();
  }

  private async cleanupOldLogs() {
    try {
      const files = await fs.readdir(this.logsDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

      for (const file of logFiles) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('清理过期日志失败:', error);
    }
  }

  exportToCsv(logs: LogEntry[]): string {
    const headers = ['ID', 'Timestamp', 'Level', 'Category', 'Message', 'Details'];
    const csvLines = [headers.join(',')];
    
    for (const log of logs) {
      const row = [
        log.id,
        log.timestamp,
        log.level,
        log.category,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    }
    
    return csvLines.join('\n');
  }

  exportToText(logs: LogEntry[]): string {
    const lines: string[] = [];
    
    for (const log of logs) {
      lines.push(`[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category.toUpperCase()}] ${log.message}`);
      if (log.details) {
        lines.push(`Details: ${JSON.stringify(log.details, null, 2)}`);
      }
      lines.push('---');
    }
    
    return lines.join('\n');
  }

  // 便捷方法
  async logInfo(category: LogEntry['category'], message: string, details?: any) {
    await this.addLog({ level: 'info', category, message, details });
  }

  async logWarn(category: LogEntry['category'], message: string, details?: any) {
    await this.addLog({ level: 'warn', category, message, details });
  }

  async logError(category: LogEntry['category'], message: string, details?: any) {
    await this.addLog({ level: 'error', category, message, details });
  }

  async logDebug(category: LogEntry['category'], message: string, details?: any) {
    await this.addLog({ level: 'debug', category, message, details });
  }
}
