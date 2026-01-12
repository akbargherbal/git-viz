// src/utils/formatting.ts

/**
 * Formatting utilities
 */

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
};

export const truncatePath = (path: string, maxLength: number = 50): string => {
  if (path.length <= maxLength) return path;
  
  const parts = path.split('/');
  if (parts.length <= 2) return path;
  
  const first = parts[0];
  const last = parts[parts.length - 1];
  
  return `${first}/.../${last}`;
};

export const getFileExtension = (filepath: string): string => {
  const match = filepath.match(/\.([^.]+)$/);
  return match ? match[1] : '';
};

export const getFileName = (filepath: string): string => {
  const parts = filepath.split('/');
  return parts[parts.length - 1];
};

export const getDirectoryPath = (filepath: string): string => {
  const parts = filepath.split('/');
  parts.pop();
  return parts.join('/') || '/';
};

export const pluralize = (count: number, singular: string, plural?: string): string => {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + 's'}`;
};
