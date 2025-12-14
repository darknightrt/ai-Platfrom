-- ================================================================================
-- AI Prompts Mini - D1 数据库初始化脚本
-- 执行方式：在 Cloudflare D1 控制台中运行此脚本
-- ================================================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('guest', 'user', 'admin')),
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 提示词表
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('code', 'mj', 'writing', 'roleplay', 'business', 'custom', 'all')),
    complexity TEXT DEFAULT 'beginner' CHECK(complexity IN ('beginner', 'intermediate', 'advanced')),
    type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text')),
    tags TEXT,  -- JSON 格式存储自定义标签
    is_custom INTEGER DEFAULT 0,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 提示词收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prompt_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, prompt_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

-- 工作流表
CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detail TEXT,
    category TEXT NOT NULL CHECK(category IN ('n8n', 'comfyui', 'dify', 'other')),
    complexity TEXT DEFAULT 'beginner' CHECK(complexity IN ('beginner', 'intermediate', 'advanced')),
    images TEXT NOT NULL,  -- JSON 数组格式存储图片链接
    workflow_json TEXT,    -- 工作流 JSON 文件内容（可能很大）
    download_url TEXT,     -- 外部下载链接
    is_custom INTEGER DEFAULT 0,
    user_id INTEGER,
    author_name TEXT,
    author_is_admin INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 工作流收藏表
CREATE TABLE IF NOT EXISTS workflow_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workflow_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workflow_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- 工作流统计表（浏览量和下载量）- 用于静态工作流的统计
-- 注意：数据库中的工作流直接使用 workflows 表的 views/downloads 字段
CREATE TABLE IF NOT EXISTS workflow_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT UNIQUE NOT NULL,
    views INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 使用记录表（可选，用于统计热门提示词）
CREATE TABLE IF NOT EXISTS usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    prompt_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('view', 'copy', 'use')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

-- 管理员设置表（站点配置，实现多端同步）
CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,  -- JSON 格式存储配置值
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_complexity ON prompts(complexity);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_is_custom ON prompts(is_custom);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_complexity ON workflows(complexity);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_custom ON workflows(is_custom);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_favorites_user_id ON workflow_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_favorites_workflow_id ON workflow_favorites(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stats_workflow_id ON workflow_stats(workflow_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_prompt_id ON usage_records(prompt_id);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- 插入默认管理员账号（密码需要在部署时修改）
-- 注意：生产环境请使用环境变量配置管理员账号
INSERT OR IGNORE INTO users (username, password, role) 
VALUES ('admin', 'admin123', 'admin');

-- ================================================================================
-- 初始化完成
-- ================================================================================
