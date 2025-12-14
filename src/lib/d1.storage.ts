/**
 * Cloudflare D1 数据库存储实现
 * 仅在 Cloudflare Pages 环境下可用
 */

import { PromptItem, PromptTag, WorkflowItem } from './types';
import { 
  IStorage, 
  D1Database, 
  DbPromptRecord, 
  DbUserRecord,
  DbWorkflowRecord,
  DbAdminSettingsRecord 
} from './storage.types';

export class D1Storage implements IStorage {
  private db: D1Database | null = null;

  constructor() {
    // 延迟初始化：不在构造函数中访问 DB
    // DB 绑定只在运行时可用，构建时不存在
  }

  /**
   * 获取 D1 数据库实例（懒加载）
   */
  private getDb(): D1Database {
    if (!this.db) {
      // 从 Cloudflare Pages 环境获取 D1 数据库绑定
      const db = (process.env as unknown as { DB: D1Database }).DB;
      
      if (!db) {
        throw new Error(
          'D1 database is only available in Cloudflare Pages environment. ' +
          'Please ensure the D1 binding is configured correctly.'
        );
      }
      
      this.db = db;
    }
    
    return this.db;
  }

  /**
   * 将数据库记录转换为 PromptItem
   */
  private recordToPromptItem(record: DbPromptRecord): PromptItem {
    let tags: PromptTag[] | undefined;
    if (record.tags) {
      try {
        tags = JSON.parse(record.tags);
      } catch {
        tags = undefined;
      }
    }
    return {
      id: record.id,
      title: record.title,
      desc: record.description || undefined,
      prompt: record.prompt,
      category: record.category,
      complexity: record.complexity,
      type: 'text',
      isCustom: Boolean(record.is_custom),
      createdAt: new Date(record.created_at).getTime(),
      tags,
    };
  }

  // ==================== 提示词操作 ====================

  /**
   * 获取所有提示词
   */
  async getAllPrompts(): Promise<PromptItem[]> {
    try {
      const result = await this.getDb()
        .prepare('SELECT * FROM prompts ORDER BY created_at DESC')
        .all<DbPromptRecord>();
      
      return (result.results || []).map(record => this.recordToPromptItem(record));
    } catch (error) {
      console.error('Failed to get all prompts:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取提示词
   */
  async getPromptById(id: string | number): Promise<PromptItem | null> {
    try {
      const record = await this.getDb()
        .prepare('SELECT * FROM prompts WHERE id = ?')
        .bind(Number(id))
        .first<DbPromptRecord>();
      
      return record ? this.recordToPromptItem(record) : null;
    } catch (error) {
      console.error('Failed to get prompt by id:', error);
      return null;
    }
  }

  /**
   * 添加提示词
   */
  async addPrompt(
    prompt: Omit<PromptItem, 'id' | 'createdAt'>, 
    userId?: number
  ): Promise<PromptItem> {
    try {
      const now = new Date().toISOString();
      
      const tagsJson = prompt.tags ? JSON.stringify(prompt.tags) : null;
      
      const result = await this.getDb()
        .prepare(`
          INSERT INTO prompts (
            title, description, prompt, category, complexity, 
            type, tags, is_custom, user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          prompt.title,
          prompt.desc || null,
          prompt.prompt,
          prompt.category,
          prompt.complexity || 'beginner',
          'text',
          tagsJson,
          prompt.isCustom ? 1 : 0,
          userId || null,
          now,
          now
        )
        .run();

      const newId = result.meta?.last_row_id || Date.now();
      
      return {
        ...prompt,
        id: newId,
        createdAt: Date.now(),
      };
    } catch (error) {
      console.error('Failed to add prompt:', error);
      throw error;
    }
  }

  /**
   * 更新提示词
   */
  async updatePrompt(id: string | number, data: Partial<PromptItem>): Promise<boolean> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
      }
      if (data.desc !== undefined) {
        updates.push('description = ?');
        values.push(data.desc);
      }
      if (data.prompt !== undefined) {
        updates.push('prompt = ?');
        values.push(data.prompt);
      }
      if (data.category !== undefined) {
        updates.push('category = ?');
        values.push(data.category);
      }
      if (data.complexity !== undefined) {
        updates.push('complexity = ?');
        values.push(data.complexity);
      }
      if (data.tags !== undefined) {
        updates.push('tags = ?');
        values.push(data.tags ? JSON.stringify(data.tags) : null);
      }

      if (updates.length === 0) return true;

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(Number(id));

      const query = `UPDATE prompts SET ${updates.join(', ')} WHERE id = ?`;
      
      const result = await this.getDb()
        .prepare(query)
        .bind(...values)
        .run();

      return result.success;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      return false;
    }
  }

  /**
   * 批量删除提示词
   */
  async deletePrompts(ids: (string | number)[]): Promise<boolean> {
    try {
      if (ids.length === 0) return true;

      const placeholders = ids.map(() => '?').join(',');
      const numericIds = ids.map(id => Number(id));

      const result = await this.getDb()
        .prepare(`DELETE FROM prompts WHERE id IN (${placeholders})`)
        .bind(...numericIds)
        .run();

      return result.success;
    } catch (error) {
      console.error('Failed to delete prompts:', error);
      return false;
    }
  }

  // ==================== 用户操作 ====================

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: number): Promise<DbUserRecord | null> {
    try {
      return await this.getDb()
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(id)
        .first<DbUserRecord>();
    } catch (error) {
      console.error('Failed to get user by id:', error);
      return null;
    }
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<DbUserRecord | null> {
    try {
      return await this.getDb()
        .prepare('SELECT * FROM users WHERE username = ?')
        .bind(username)
        .first<DbUserRecord>();
    } catch (error) {
      console.error('Failed to get user by username:', error);
      return null;
    }
  }

  /**
   * 创建用户
   */
  async createUser(
    username: string, 
    password: string, 
    role: string = 'user'
  ): Promise<DbUserRecord | null> {
    try {
      const now = new Date().toISOString();
      
      const result = await this.getDb()
        .prepare(`
          INSERT INTO users (username, password, role, created_at) 
          VALUES (?, ?, ?, ?)
        `)
        .bind(username, password, role, now)
        .run();

      if (result.success) {
        return this.getUserByUsername(username);
      }
      return null;
    } catch (error) {
      console.error('Failed to create user:', error);
      return null;
    }
  }

  /**
   * 验证用户登录
   */
  async verifyUser(username: string, password: string): Promise<DbUserRecord | null> {
    try {
      const user = await this.getDb()
        .prepare('SELECT * FROM users WHERE username = ? AND password = ?')
        .bind(username, password)
        .first<DbUserRecord>();
      
      return user;
    } catch (error) {
      console.error('Failed to verify user:', error);
      return null;
    }
  }

  // ==================== 提示词收藏操作 ====================

  /**
   * 获取用户的提示词收藏列表
   */
  async getPromptFavorites(userId: number): Promise<string[]> {
    try {
      const result = await this.getDb()
        .prepare('SELECT prompt_id FROM favorites WHERE user_id = ?')
        .bind(userId)
        .all<{ prompt_id: number }>();
      
      return (result.results || []).map(r => String(r.prompt_id));
    } catch (error) {
      console.error('Failed to get prompt favorites:', error);
      return [];
    }
  }

  /**
   * 添加提示词收藏
   */
  async addPromptFavorite(userId: number, promptId: string | number): Promise<boolean> {
    try {
      const result = await this.getDb()
        .prepare('INSERT OR IGNORE INTO favorites (user_id, prompt_id) VALUES (?, ?)')
        .bind(userId, Number(promptId))
        .run();
      
      return result.success;
    } catch (error) {
      console.error('Failed to add prompt favorite:', error);
      return false;
    }
  }

  /**
   * 移除提示词收藏
   */
  async removePromptFavorite(userId: number, promptId: string | number): Promise<boolean> {
    try {
      const result = await this.getDb()
        .prepare('DELETE FROM favorites WHERE user_id = ? AND prompt_id = ?')
        .bind(userId, Number(promptId))
        .run();
      
      return result.success;
    } catch (error) {
      console.error('Failed to remove prompt favorite:', error);
      return false;
    }
  }

  // ==================== 工作流收藏操作 ====================

  /**
   * 获取用户的工作流收藏列表
   */
  async getWorkflowFavorites(userId: number): Promise<string[]> {
    try {
      const result = await this.getDb()
        .prepare('SELECT workflow_id FROM workflow_favorites WHERE user_id = ?')
        .bind(userId)
        .all<{ workflow_id: number }>();
      
      // workflow_id 在数据库中是 INTEGER 类型，需要转换为字符串
      return (result.results || []).map(r => String(r.workflow_id));
    } catch (error) {
      console.error('Failed to get workflow favorites:', error);
      return [];
    }
  }

  /**
   * 添加工作流收藏
   */
  async addWorkflowFavorite(userId: number, workflowId: string | number): Promise<boolean> {
    try {
      // workflow_id 在数据库中是 INTEGER 类型
      const result = await this.getDb()
        .prepare('INSERT OR IGNORE INTO workflow_favorites (user_id, workflow_id) VALUES (?, ?)')
        .bind(userId, Number(workflowId))
        .run();
      
      return result.success;
    } catch (error) {
      console.error('Failed to add workflow favorite:', error);
      return false;
    }
  }

  /**
   * 移除工作流收藏
   */
  async removeWorkflowFavorite(userId: number, workflowId: string | number): Promise<boolean> {
    try {
      // workflow_id 在数据库中是 INTEGER 类型
      const result = await this.getDb()
        .prepare('DELETE FROM workflow_favorites WHERE user_id = ? AND workflow_id = ?')
        .bind(userId, Number(workflowId))
        .run();
      
      return result.success;
    } catch (error) {
      console.error('Failed to remove workflow favorite:', error);
      return false;
    }
  }

  // ==================== 工作流统计操作 ====================

  /**
   * 增加工作流浏览量
   * 使用 UPSERT 模式：如果记录不存在则创建，存在则增加
   */
  async incrementWorkflowViews(workflowId: string | number): Promise<number> {
    try {
      const id = String(workflowId);
      
      // 先尝试更新现有记录
      await this.getDb()
        .prepare(`
          INSERT INTO workflow_stats (workflow_id, views, downloads)
          VALUES (?, 1, 0)
          ON CONFLICT(workflow_id) DO UPDATE SET views = views + 1
        `)
        .bind(id)
        .run();
      
      // 获取当前值
      const result = await this.getDb()
        .prepare('SELECT views FROM workflow_stats WHERE workflow_id = ?')
        .bind(id)
        .first<{ views: number }>();
      
      return result?.views || 1;
    } catch (error) {
      console.error('Failed to increment workflow views:', error);
      return 0;
    }
  }

  /**
   * 增加工作流下载量
   */
  async incrementWorkflowDownloads(workflowId: string | number): Promise<number> {
    try {
      const id = String(workflowId);
      
      await this.getDb()
        .prepare(`
          INSERT INTO workflow_stats (workflow_id, views, downloads)
          VALUES (?, 0, 1)
          ON CONFLICT(workflow_id) DO UPDATE SET downloads = downloads + 1
        `)
        .bind(id)
        .run();
      
      const result = await this.getDb()
        .prepare('SELECT downloads FROM workflow_stats WHERE workflow_id = ?')
        .bind(id)
        .first<{ downloads: number }>();
      
      return result?.downloads || 1;
    } catch (error) {
      console.error('Failed to increment workflow downloads:', error);
      return 0;
    }
  }

  /**
   * 获取工作流统计数据
   */
  async getWorkflowStats(workflowId: string | number): Promise<{ views: number; downloads: number }> {
    try {
      const result = await this.getDb()
        .prepare('SELECT views, downloads FROM workflow_stats WHERE workflow_id = ?')
        .bind(String(workflowId))
        .first<{ views: number; downloads: number }>();
      
      return result || { views: 0, downloads: 0 };
    } catch (error) {
      console.error('Failed to get workflow stats:', error);
      return { views: 0, downloads: 0 };
    }
  }

  // ==================== 工作流 CRUD 操作 ====================

  /**
   * 将数据库记录转换为 WorkflowItem
   */
  private recordToWorkflowItem(record: DbWorkflowRecord): WorkflowItem {
    let images: string[] = [];
    if (record.images) {
      try {
        images = JSON.parse(record.images);
      } catch {
        images = [];
      }
    }
    return {
      id: record.id,
      title: record.title,
      description: record.description,
      detail: record.detail || undefined,
      category: record.category,
      complexity: record.complexity,
      images,
      workflowJson: record.workflow_json || undefined,
      downloadUrl: record.download_url || undefined,
      isCustom: Boolean(record.is_custom),
      createdAt: new Date(record.created_at).getTime(),
      updatedAt: record.updated_at ? new Date(record.updated_at).getTime() : undefined,
      author: record.author_name ? {
        name: record.author_name,
        isAdmin: Boolean(record.author_is_admin),
      } : undefined,
      views: record.views || 0,
      downloads: record.downloads || 0,
    };
  }

  /**
   * 获取所有工作流
   * 使用 LEFT JOIN 关联 workflow_stats 表获取真实的统计数据
   */
  async getAllWorkflows(): Promise<WorkflowItem[]> {
    try {
      const result = await this.getDb()
        .prepare(`
          SELECT 
            w.*,
            COALESCE(s.views, w.views, 0) as views,
            COALESCE(s.downloads, w.downloads, 0) as downloads
          FROM workflows w
          LEFT JOIN workflow_stats s ON CAST(w.id AS TEXT) = s.workflow_id
          ORDER BY w.created_at DESC
        `)
        .all<DbWorkflowRecord>();
      
      return (result.results || []).map(record => this.recordToWorkflowItem(record));
    } catch (error) {
      console.error('Failed to get all workflows:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取工作流
   * 使用 LEFT JOIN 关联 workflow_stats 表获取真实的统计数据
   */
  async getWorkflowById(id: string | number): Promise<WorkflowItem | null> {
    try {
      const record = await this.getDb()
        .prepare(`
          SELECT 
            w.*,
            COALESCE(s.views, w.views, 0) as views,
            COALESCE(s.downloads, w.downloads, 0) as downloads
          FROM workflows w
          LEFT JOIN workflow_stats s ON CAST(w.id AS TEXT) = s.workflow_id
          WHERE w.id = ?
        `)
        .bind(Number(id))
        .first<DbWorkflowRecord>();
      
      return record ? this.recordToWorkflowItem(record) : null;
    } catch (error) {
      console.error('Failed to get workflow by id:', error);
      return null;
    }
  }

  /**
   * 添加工作流
   */
  async addWorkflow(
    workflow: Omit<WorkflowItem, 'id' | 'createdAt' | 'views' | 'downloads'>,
    userId?: number
  ): Promise<WorkflowItem> {
    try {
      const now = new Date().toISOString();
      const imagesJson = JSON.stringify(workflow.images || []);
      
      const result = await this.getDb()
        .prepare(`
          INSERT INTO workflows (
            title, description, detail, category, complexity,
            images, workflow_json, download_url, is_custom, user_id,
            author_name, author_is_admin, views, downloads, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          workflow.title,
          workflow.description,
          workflow.detail || null,
          workflow.category,
          workflow.complexity || 'beginner',
          imagesJson,
          workflow.workflowJson || null,
          workflow.downloadUrl || null,
          workflow.isCustom ? 1 : 0,
          userId || null,
          workflow.author?.name || null,
          workflow.author?.isAdmin ? 1 : 0,
          0, // views
          0, // downloads
          now,
          now
        )
        .run();

      const newId = result.meta?.last_row_id || Date.now();
      
      return {
        ...workflow,
        id: newId,
        createdAt: Date.now(),
        views: 0,
        downloads: 0,
      };
    } catch (error) {
      console.error('Failed to add workflow:', error);
      throw error;
    }
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(id: string | number, data: Partial<WorkflowItem>): Promise<boolean> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
      }
      if (data.detail !== undefined) {
        updates.push('detail = ?');
        values.push(data.detail);
      }
      if (data.category !== undefined) {
        updates.push('category = ?');
        values.push(data.category);
      }
      if (data.complexity !== undefined) {
        updates.push('complexity = ?');
        values.push(data.complexity);
      }
      if (data.images !== undefined) {
        updates.push('images = ?');
        values.push(JSON.stringify(data.images));
      }
      if (data.workflowJson !== undefined) {
        updates.push('workflow_json = ?');
        values.push(data.workflowJson);
      }
      if (data.downloadUrl !== undefined) {
        updates.push('download_url = ?');
        values.push(data.downloadUrl);
      }
      if (data.author !== undefined) {
        updates.push('author_name = ?');
        values.push(data.author?.name || null);
        updates.push('author_is_admin = ?');
        values.push(data.author?.isAdmin ? 1 : 0);
      }

      if (updates.length === 0) return true;

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(Number(id));

      const query = `UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`;
      
      const result = await this.getDb()
        .prepare(query)
        .bind(...values)
        .run();

      return result.success;
    } catch (error) {
      console.error('Failed to update workflow:', error);
      return false;
    }
  }

  /**
   * 批量删除工作流
   */
  async deleteWorkflows(ids: (string | number)[]): Promise<boolean> {
    try {
      if (ids.length === 0) return true;

      const placeholders = ids.map(() => '?').join(',');
      const numericIds = ids.map(id => Number(id));

      const result = await this.getDb()
        .prepare(`DELETE FROM workflows WHERE id IN (${placeholders})`)
        .bind(...numericIds)
        .run();

      return result.success;
    } catch (error) {
      console.error('Failed to delete workflows:', error);
      return false;
    }
  }

  // ==================== 初始化 ====================

  /**
   * 初始化管理员账号（从环境变量）
   * 优先级：环境变量 > SQL默认账号
   */
  async initializeUser(): Promise<void> {
    try {
      const Username =process.env.USERNAME;
      const Password =process.env.PASSWORD;

      // 如果没有配置环境变量，跳过（使用SQL默认账号）
      if (!Username || !Password) {
        console.log('No admin credentials in environment variables, using SQL defaults');
        return;
      }

      // 检查管理员是否已存在
      const existing = await this.getUserByUsername(Username);
      
      if (existing) {
        console.log(` user '${Username}' already exists`);
        return;
      }

      // 创建环境变量配置的管理员账号
      const newAdmin = await this.createUser(Username, Password, 'admin');
      
      if (newAdmin) {
        console.log(`Admin user '${Username}' created successfully from environment variables`);
      }
    } catch (error) {
      console.error('Failed to initialize  user:', error);
    }
  }

  // ==================== 管理员设置操作 ====================

  /**
   * 获取所有管理员设置
   * 返回合并后的配置对象
   */
  async getAdminSettings(): Promise<Record<string, unknown>> {
    try {
      const result = await this.getDb()
        .prepare('SELECT key, value FROM admin_settings')
        .all<DbAdminSettingsRecord>();
      
      const settings: Record<string, unknown> = {};
      
      for (const record of result.results || []) {
        try {
          settings[record.key] = JSON.parse(record.value);
        } catch {
          settings[record.key] = record.value;
        }
      }
      
      return settings;
    } catch (error) {
      console.error('Failed to get admin settings:', error);
      return {};
    }
  }

  /**
   * 更新管理员设置
   * 使用 UPSERT 模式：存在则更新，不存在则插入
   */
  async updateAdminSettings(settings: Record<string, unknown>): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      for (const [key, value] of Object.entries(settings)) {
        const valueJson = JSON.stringify(value);
        
        await this.getDb()
          .prepare(`
            INSERT INTO admin_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
          `)
          .bind(key, valueJson, now, valueJson, now)
          .run();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update admin settings:', error);
      return false;
    }
  }

  // ==================== 初始化 ====================

  /**
   * 用静态数据初始化数据库
   */
  async initializeWithStaticData(prompts: PromptItem[]): Promise<void> {
    try {
      // 1. 初始化管理员账号
      await this.initializeUser();

      // 2. 检查是否已有提示词数据
      const existing = await this.getDb()
        .prepare('SELECT COUNT(*) as count FROM prompts')
        .first<{ count: number }>();
      
      if (existing && existing.count > 0) {
        console.log('Database already has data, skipping prompts initialization');
        return;
      }

      // 3. 批量插入静态数据
      for (const prompt of prompts) {
        await this.addPrompt({
          title: prompt.title,
          desc: prompt.desc,
          prompt: prompt.prompt,
          category: prompt.category,
          complexity: prompt.complexity || 'beginner',
          type: 'text',
          tags: prompt.tags,
          isCustom: false,
        });
      }

      console.log(`Initialized database with ${prompts.length} prompts`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}
