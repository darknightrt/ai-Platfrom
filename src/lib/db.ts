/**
 * 数据库存储层抽象
 * 支持多种存储方式：localStorage、D1
 */

import { PromptItem, WorkflowItem } from './types';
import { IStorage, STORAGE_TYPE, StorageType } from './storage.types';
import { D1Storage } from './d1.storage';

// 存储实例缓存（单例模式）
let storageInstance: IStorage | null = null;

/**
 * 创建存储实例（工厂模式）
 * 注意：在构建时不会实际初始化 D1，只在运行时首次调用时初始化
 */
function createStorage(): IStorage | null {
  switch (STORAGE_TYPE) {
    case 'd1':
      // D1Storage 构造函数已改为延迟初始化，不会在构建时访问 DB
      return new D1Storage();
    case 'localstorage':
    default:
      // localStorage 模式在客户端直接使用，不需要 IStorage 实例
      return null;
  }
}

/**
 * 获取存储实例（懒加载）
 * 只在实际需要时创建实例
 */
export function getStorage(): IStorage | null {
  if (storageInstance === null && STORAGE_TYPE !== 'localstorage') {
    storageInstance = createStorage();
  }
  return storageInstance;
}

/**
 * 数据库管理器
 * 提供统一的 API 接口给上层业务代码
 */
export class DbManager {
  private storage: IStorage | null;

  constructor() {
    this.storage = getStorage();
  }

  /**
   * 检查是否使用服务端存储
   */
  isServerStorage(): boolean {
    return STORAGE_TYPE === 'd1';
  }

  /**
   * 获取存储类型
   */
  getStorageType(): StorageType {
    return STORAGE_TYPE;
  }

  // ==================== 提示词操作 ====================

  async getAllPrompts(): Promise<PromptItem[]> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getAllPrompts();
  }

  async getPromptById(id: string | number): Promise<PromptItem | null> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getPromptById(id);
  }

  async addPrompt(
    prompt: Omit<PromptItem, 'id' | 'createdAt'>,
    userId?: number
  ): Promise<PromptItem> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.addPrompt(prompt, userId);
  }

  async updatePrompt(id: string | number, data: Partial<PromptItem>): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.updatePrompt(id, data);
  }

  async deletePrompts(ids: (string | number)[]): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.deletePrompts(ids);
  }

  // ==================== 用户操作 ====================

  async verifyUser(username: string, password: string) {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.verifyUser(username, password);
  }

  async createUser(username: string, password: string, role: string = 'user') {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.createUser(username, password, role);
  }

  async getUserByUsername(username: string) {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getUserByUsername(username);
  }

  // ==================== 提示词收藏操作 ====================

  async getPromptFavorites(userId: number): Promise<string[]> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getPromptFavorites(userId);
  }

  async addPromptFavorite(userId: number, promptId: string | number): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.addPromptFavorite(userId, promptId);
  }

  async removePromptFavorite(userId: number, promptId: string | number): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.removePromptFavorite(userId, promptId);
  }

  // ==================== 工作流收藏操作 ====================

  async getWorkflowFavorites(userId: number): Promise<string[]> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getWorkflowFavorites(userId);
  }

  async addWorkflowFavorite(userId: number, workflowId: string | number): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.addWorkflowFavorite(userId, workflowId);
  }

  async removeWorkflowFavorite(userId: number, workflowId: string | number): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.removeWorkflowFavorite(userId, workflowId);
  }

  // ==================== 工作流统计操作 ====================

  async incrementWorkflowViews(workflowId: string | number): Promise<number> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.incrementWorkflowViews(workflowId);
  }

  async incrementWorkflowDownloads(workflowId: string | number): Promise<number> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.incrementWorkflowDownloads(workflowId);
  }

  async getWorkflowStats(workflowId: string | number): Promise<{ views: number; downloads: number }> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getWorkflowStats(workflowId);
  }

  // ==================== 工作流 CRUD 操作 ====================

  async getAllWorkflows(): Promise<WorkflowItem[]> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getAllWorkflows();
  }

  async getWorkflowById(id: string | number): Promise<WorkflowItem | null> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getWorkflowById(id);
  }

  async addWorkflow(
    workflow: Omit<WorkflowItem, 'id' | 'createdAt' | 'views' | 'downloads'>,
    userId?: number
  ): Promise<WorkflowItem> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.addWorkflow(workflow, userId);
  }

  async updateWorkflow(id: string | number, data: Partial<WorkflowItem>): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.updateWorkflow(id, data);
  }

  async deleteWorkflows(ids: (string | number)[]): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.deleteWorkflows(ids);
  }

  // ==================== 管理员设置操作 ====================

  async getAdminSettings(): Promise<Record<string, unknown>> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.getAdminSettings();
  }

  async updateAdminSettings(settings: Record<string, unknown>): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Server storage not available');
    }
    return this.storage.updateAdminSettings(settings);
  }

  // ==================== 初始化 ====================

  async initializeWithStaticData(prompts: PromptItem[]): Promise<void> {
    if (!this.storage || !this.storage.initializeWithStaticData) {
      throw new Error('Server storage not available');
    }
    return this.storage.initializeWithStaticData(prompts);
  }
}

// 导出单例实例
export const db = new DbManager();
