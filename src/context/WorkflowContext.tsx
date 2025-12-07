"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { WorkflowItem } from '../lib/types';
import { STORAGE_TYPE, isServerStorage } from '../lib/storage.types';

// 静态示例数据
const staticWorkflows: WorkflowItem[] = [
  {
    id: 1,
    title: 'NASA天文图自动生成Spotify歌单',
    description: '此n8n工作流巧妙融合AI与自动化技术，每日定时获取NASA天文图（APOD），通过OpenAI智能分析图片主题、情感与意境。',
    detail: `## 工作流说明

此n8n工作流巧妙融合AI与自动化技术，每日定时获取NASA天文图（APOD），通过OpenAI智能分析图片主题、情感与意境。它能自动生成富有创意的Spotify歌单名称、描述，并推荐匹配的音乐曲目。

### 主要功能
- 每日自动获取NASA天文图
- AI智能分析图片内容
- 自动创建Spotify歌单
- 智能推荐匹配音乐

### 使用方法
1. 导入工作流JSON文件到n8n
2. 配置NASA API密钥
3. 配置OpenAI API密钥
4. 配置Spotify OAuth
5. 启动工作流`,
    category: 'n8n',
    images: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800',
    ],
    isCustom: false,
    createdAt: Date.now() - 86400000 * 3,
    views: 156,
    downloads: 42,
  },
  {
    id: 2,
    title: 'ComfyUI图像增强工作流',
    description: '专业级图像增强工作流，支持超分辨率、降噪、色彩校正等多种处理。',
    detail: `## ComfyUI图像增强工作流

这是一个功能强大的图像处理工作流，集成了多种AI模型。

### 功能特点
- 4K超分辨率放大
- 智能降噪处理
- 自动色彩校正
- 批量处理支持`,
    category: 'comfyui',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    ],
    isCustom: false,
    createdAt: Date.now() - 86400000 * 5,
    views: 89,
    downloads: 23,
  },
  {
    id: 3,
    title: 'Dify智能客服助手',
    description: '基于Dify构建的智能客服系统，支持多轮对话、知识库检索和自动回复。',
    detail: `## Dify智能客服助手

企业级智能客服解决方案。

### 核心功能
- 多轮对话理解
- 知识库智能检索
- 自动工单分类
- 情感分析`,
    category: 'dify',
    images: [
      'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
      'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800',
      'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=800',
    ],
    isCustom: false,
    createdAt: Date.now() - 86400000 * 7,
    views: 234,
    downloads: 67,
  },
];

interface WorkflowContextType {
  workflows: WorkflowItem[];
  addWorkflow: (workflow: Omit<WorkflowItem, 'id' | 'isCustom' | 'createdAt' | 'views' | 'downloads'>) => Promise<void>;
  updateWorkflow: (id: string | number, data: Partial<Omit<WorkflowItem, 'id' | 'createdAt'>>) => Promise<void>;
  deleteWorkflows: (ids: (string | number)[]) => Promise<void>;
  importWorkflows: (workflows: Omit<WorkflowItem, 'id' | 'isCustom' | 'createdAt'>[]) => Promise<number>;
  refreshWorkflows: () => Promise<void>;
  incrementViews: (id: string | number) => Promise<number>;
  incrementDownloads: (id: string | number) => Promise<number>;
  isLoaded: boolean;
  storageType: string;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [allWorkflows, setAllWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const STORAGE_KEY = 'workflow_master_db_v1';

  const STATS_STORAGE_KEY = 'workflow_stats_v1';

  // 合并统计数据到工作流
  const mergeStatsToWorkflows = useCallback((workflows: WorkflowItem[]): WorkflowItem[] => {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) {
        const stats = JSON.parse(stored);
        return workflows.map(w => {
          const workflowStats = stats[String(w.id)];
          if (workflowStats) {
            return {
              ...w,
              views: Math.max(w.views || 0, workflowStats.views || 0),
              downloads: Math.max(w.downloads || 0, workflowStats.downloads || 0),
            };
          }
          return w;
        });
      }
    } catch (e) {
      console.error('Failed to merge stats:', e);
    }
    return workflows;
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let workflows: WorkflowItem[];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.length === 0) {
          workflows = staticWorkflows;
        } else {
          workflows = parsed;
        }
      } catch (e) {
        console.error("Failed to parse workflows", e);
        workflows = staticWorkflows;
      }
    } else {
      workflows = staticWorkflows;
    }
    // 合并 localStorage 中的统计数据
    setAllWorkflows(mergeStatsToWorkflows(workflows));
  }, [mergeStatsToWorkflows]);

  const saveToLocalStorage = useCallback((workflows: WorkflowItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  }, []);

  // ==================== D1 API 模式 ====================

  const loadFromAPI = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      
      if (data.success && data.workflows) {
        // 如果数据库为空，初始化静态数据
        if (data.workflows.length === 0) {
          await initializeStaticData();
        } else {
          setAllWorkflows(data.workflows);
        }
      } else {
        console.error('Failed to load workflows from API:', data.error);
        // 降级到静态数据
        setAllWorkflows(staticWorkflows);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      // API 错误时降级到静态数据
      setAllWorkflows(staticWorkflows);
    }
  }, []);

  const initializeStaticData = async () => {
    try {
      const response = await fetch('/api/workflows/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // isInitialData: true 表示这是初始化数据，不显示"新建"标签
        body: JSON.stringify({ workflows: staticWorkflows, isInitialData: true }),
      });
      const data = await response.json();
      
      if (data.success) {
        // 重新加载数据
        const reloadResponse = await fetch('/api/workflows');
        const reloadData = await reloadResponse.json();
        if (reloadData.success) {
          setAllWorkflows(reloadData.workflows);
        }
      }
    } catch (error) {
      console.error('Failed to initialize static workflow data:', error);
      setAllWorkflows(staticWorkflows);
    }
  };

  // ==================== 初始化加载 ====================

  useEffect(() => {
    const initLoad = async () => {
      if (isServerStorage()) {
        await loadFromAPI();
      } else {
        loadFromLocalStorage();
      }
      setIsLoaded(true);
    };
    
    initLoad();
  }, [loadFromAPI, loadFromLocalStorage]);

  // localStorage 模式下监听变化并保存
  useEffect(() => {
    if (isLoaded && !isServerStorage()) {
      saveToLocalStorage(allWorkflows);
    }
  }, [allWorkflows, isLoaded, saveToLocalStorage]);

  const addWorkflow = useCallback(async (data: Omit<WorkflowItem, 'id' | 'isCustom' | 'createdAt' | 'views' | 'downloads'>) => {
    if (isServerStorage()) {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, isCustom: true }),
        });
        const result = await response.json();
        
        if (result.success && result.workflow) {
          setAllWorkflows(prev => [result.workflow, ...prev]);
        }
      } catch (error) {
        console.error('Failed to add workflow:', error);
      }
    } else {
      const newWorkflow: WorkflowItem = {
        ...data,
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        isCustom: true,
        createdAt: Date.now(),
        views: 0,
        downloads: 0,
      };
      setAllWorkflows(prev => [newWorkflow, ...prev]);
    }
  }, []);

  const updateWorkflow = useCallback(async (id: string | number, data: Partial<Omit<WorkflowItem, 'id' | 'createdAt'>>) => {
    if (isServerStorage()) {
      try {
        const response = await fetch(`/api/workflows/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        
        if (result.success && result.workflow) {
          setAllWorkflows(prev => 
            prev.map(item => 
              String(item.id) === String(id) ? result.workflow : item
            )
          );
        }
      } catch (error) {
        console.error('Failed to update workflow:', error);
      }
    } else {
      setAllWorkflows(prev => 
        prev.map(item => 
          String(item.id) === String(id) 
            ? { ...item, ...data } 
            : item
        )
      );
    }
  }, []);

  const deleteWorkflows = useCallback(async (ids: (string | number)[]) => {
    if (isServerStorage()) {
      try {
        const response = await fetch('/api/workflows/batch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        const result = await response.json();
        
        if (result.success) {
          setAllWorkflows(prev => prev.filter(w => !ids.includes(w.id) && !ids.includes(String(w.id))));
        }
      } catch (error) {
        console.error('Failed to delete workflows:', error);
      }
    } else {
      setAllWorkflows(prev => prev.filter(w => !ids.includes(w.id) && !ids.includes(String(w.id))));
    }
  }, []);

  const importWorkflows = useCallback(async (workflows: Omit<WorkflowItem, 'id' | 'isCustom' | 'createdAt'>[]): Promise<number> => {
    if (isServerStorage()) {
      try {
        const response = await fetch('/api/workflows/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflows }),
        });
        const result = await response.json();
        
        if (result.success) {
          // 重新加载数据
          await loadFromAPI();
          return result.imported || 0;
        }
      } catch (error) {
        console.error('Failed to import workflows:', error);
      }
      return 0;
    } else {
      const newWorkflows = workflows.map(data => ({
        ...data,
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        isCustom: true,
        createdAt: Date.now(),
        views: 0,
        downloads: 0,
      }));
      setAllWorkflows(prev => [...newWorkflows, ...prev]);
      return newWorkflows.length;
    }
  }, [loadFromAPI]);

  const refreshWorkflows = useCallback(async () => {
    if (isServerStorage()) {
      await loadFromAPI();
    } else {
      loadFromLocalStorage();
    }
  }, [loadFromAPI, loadFromLocalStorage]);

  // 从 localStorage 获取统计数据
  const getLocalStats = useCallback((id: string | number): { views: number; downloads: number } => {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) {
        const stats = JSON.parse(stored);
        return stats[String(id)] || { views: 0, downloads: 0 };
      }
    } catch (e) {
      console.error('Failed to get local stats:', e);
    }
    return { views: 0, downloads: 0 };
  }, []);

  // 保存统计数据到 localStorage
  const saveLocalStats = useCallback((id: string | number, stats: { views: number; downloads: number }) => {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      const allStats = stored ? JSON.parse(stored) : {};
      allStats[String(id)] = stats;
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(allStats));
    } catch (e) {
      console.error('Failed to save local stats:', e);
    }
  }, []);

  // 增加浏览量
  const incrementViews = useCallback(async (id: string | number): Promise<number> => {
    // 尝试调用 API (D1 模式)
    try {
      const response = await fetch('/api/workflows/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(id), type: 'view' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.source === 'd1' && data.count > 0) {
          // D1 模式成功，更新本地状态
          setAllWorkflows(prev => 
            prev.map(w => String(w.id) === String(id) ? { ...w, views: data.count } : w)
          );
          return data.count;
        }
      }
    } catch (e) {
      console.error('API call failed, using localStorage:', e);
    }

    // 回退到 localStorage 模式
    const currentStats = getLocalStats(id);
    const newViews = currentStats.views + 1;
    saveLocalStats(id, { ...currentStats, views: newViews });
    
    // 更新本地状态
    setAllWorkflows(prev => 
      prev.map(w => String(w.id) === String(id) ? { ...w, views: (w.views || 0) + 1 } : w)
    );
    
    return newViews;
  }, [getLocalStats, saveLocalStats]);

  // 增加下载量
  const incrementDownloads = useCallback(async (id: string | number): Promise<number> => {
    // 尝试调用 API (D1 模式)
    try {
      const response = await fetch('/api/workflows/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(id), type: 'download' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.source === 'd1' && data.count > 0) {
          // D1 模式成功，更新本地状态
          setAllWorkflows(prev => 
            prev.map(w => String(w.id) === String(id) ? { ...w, downloads: data.count } : w)
          );
          return data.count;
        }
      }
    } catch (e) {
      console.error('API call failed, using localStorage:', e);
    }

    // 回退到 localStorage 模式
    const currentStats = getLocalStats(id);
    const newDownloads = currentStats.downloads + 1;
    saveLocalStats(id, { ...currentStats, downloads: newDownloads });
    
    // 更新本地状态
    setAllWorkflows(prev => 
      prev.map(w => String(w.id) === String(id) ? { ...w, downloads: (w.downloads || 0) + 1 } : w)
    );
    
    return newDownloads;
  }, [getLocalStats, saveLocalStats]);

  return (
    <WorkflowContext.Provider value={{ 
      workflows: allWorkflows, 
      addWorkflow, 
      updateWorkflow, 
      deleteWorkflows, 
      importWorkflows,
      refreshWorkflows,
      incrementViews,
      incrementDownloads,
      isLoaded,
      storageType: STORAGE_TYPE
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflows = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflows must be used within a WorkflowProvider');
  return context;
};
