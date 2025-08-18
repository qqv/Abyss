/**
 * 存储设置工具函数
 * 用于检查和管理集合运行结果的存储位置设置
 */

export interface StorageSettings {
  collectionResultsStorage: 'browser' | 'database';
}

/**
 * 获取当前的存储设置
 */
export function getStorageSettings(): StorageSettings {
  try {
    if (typeof localStorage !== 'undefined') {
      const savedSettings = localStorage.getItem('abyss-general-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          collectionResultsStorage: parsed.collectionResultsStorage || 'browser'
        };
      }
    }
  } catch (error) {
    console.error('获取存储设置失败:', error);
  }
  
  // 默认值
  return {
    collectionResultsStorage: 'browser'
  };
}

/**
 * 检查是否应该使用数据库存储
 */
export function shouldUseDatabase(): boolean {
  const settings = getStorageSettings();
  return settings.collectionResultsStorage === 'database';
}

/**
 * 检查是否应该使用浏览器存储
 */
export function shouldUseBrowser(): boolean {
  const settings = getStorageSettings();
  return settings.collectionResultsStorage === 'browser';
}

/**
 * 更新存储设置
 */
export function updateStorageSettings(settings: Partial<StorageSettings>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const currentSettings = localStorage.getItem('abyss-general-settings');
      const parsed = currentSettings ? JSON.parse(currentSettings) : {};
      const updated = { ...parsed, ...settings };
      localStorage.setItem('abyss-general-settings', JSON.stringify(updated));
    }
  } catch (error) {
    console.error('更新存储设置失败:', error);
  }
}

/**
 * 获取集合运行历史的存储位置描述
 */
export function getStorageLocationDescription(): string {
  const settings = getStorageSettings();
  switch (settings.collectionResultsStorage) {
    case 'database':
      return '数据库存储 - 持久保存，支持跨设备访问';
    case 'browser':
    default:
      return '浏览器存储 - 本地缓存，快速访问';
  }
}
