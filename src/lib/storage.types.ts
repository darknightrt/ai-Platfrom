/**
 * 存储层类型定义
 * 支持多种存储方式：localStorage、D1
 */

import { PromptItem, Category, Complexity, WorkflowItem, WorkflowCategory, WorkflowComplexity } from './types';

// D1 数据库类型定义
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
}

export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: {
    changes: number;
    last_row_id: number;
  };
}

// 数据库中的提示词记录
export interface DbPromptRecord {
  id: number;
  title: string;
  description: string | null;
  prompt: string;
  category: Category;
  complexity: Complexity;
  type: 'text';
  tags: string | null; // JSON 字符串
  is_custom: number; // SQLite boolean
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

// 数据库中的用户记录
export interface DbUserRecord {
  id: number;
  username: string;
  password: string;
  role: 'guest' | 'user' | 'admin';
  avatar: string | null;
  created_at: string;
}

// 数据库中的管理员设置记录
export interface DbAdminSettingsRecord {
  id: number;
  key: string;
  value: string; // JSON 字符串
  updated_at: string;
}

// 数据库中的工作流记录
export interface DbWorkflowRecord {
  id: number;
  title: string;
  description: string;
  detail: string | null;
  category: WorkflowCategory;
  complexity: WorkflowComplexity;
  images: string; // JSON 数组字符串
  workflow_json: string | null; // 工作流 JSON 文件内容
  download_url: string | null;
  is_custom: number; // SQLite boolean
  user_id: number | null;
  author_name: string | null;
  author_is_admin: number; // SQLite boolean
  views: number;
  downloads: number;
  created_at: string;
  updated_at: string;
}

// 存储接口定义
export interface IStorage {
  // 提示词操作
  getAllPrompts(): Promise<PromptItem[]>;
  getPromptById(id: string | number): Promise<PromptItem | null>;
  addPrompt(prompt: Omit<PromptItem, 'id' | 'createdAt'>, userId?: number): Promise<PromptItem>;
  updatePrompt(id: string | number, data: Partial<PromptItem>): Promise<boolean>;
  deletePrompts(ids: (string | number)[]): Promise<boolean>;
  
  // 用户操作
  getUserById(id: number): Promise<DbUserRecord | null>;
  getUserByUsername(username: string): Promise<DbUserRecord | null>;
  createUser(username: string, password: string, role: string): Promise<DbUserRecord | null>;
  verifyUser(username: string, password: string): Promise<DbUserRecord | null>;
  
  // 提示词收藏操作
  getPromptFavorites(userId: number): Promise<string[]>;
  addPromptFavorite(userId: number, promptId: string | number): Promise<boolean>;
  removePromptFavorite(userId: number, promptId: string | number): Promise<boolean>;
  
  // 工作流收藏操作
  getWorkflowFavorites(userId: number): Promise<string[]>;
  addWorkflowFavorite(userId: number, workflowId: string | number): Promise<boolean>;
  removeWorkflowFavorite(userId: number, workflowId: string | number): Promise<boolean>;
  
  // 工作流统计操作
  incrementWorkflowViews(workflowId: string | number): Promise<number>;
  incrementWorkflowDownloads(workflowId: string | number): Promise<number>;
  getWorkflowStats(workflowId: string | number): Promise<{ views: number; downloads: number }>;
  
  // 工作流 CRUD 操作
  getAllWorkflows(): Promise<WorkflowItem[]>;
  getWorkflowById(id: string | number): Promise<WorkflowItem | null>;
  addWorkflow(workflow: Omit<WorkflowItem, 'id' | 'createdAt' | 'views' | 'downloads'>, userId?: number): Promise<WorkflowItem>;
  updateWorkflow(id: string | number, data: Partial<WorkflowItem>): Promise<boolean>;
  deleteWorkflows(ids: (string | number)[]): Promise<boolean>;
  
  // 初始化
  initializeWithStaticData?(prompts: PromptItem[]): Promise<void>;
  
  // 管理员设置操作
  getAdminSettings(): Promise<Record<string, unknown>>;
  updateAdminSettings(settings: Record<string, unknown>): Promise<boolean>;
}

// 存储类型
export type StorageType = 'localstorage' | 'd1';

// 环境变量配置
export const STORAGE_TYPE: StorageType = 
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as StorageType) || 'localstorage';

// 判断是否使用服务端存储
export const isServerStorage = () => STORAGE_TYPE === 'd1';
