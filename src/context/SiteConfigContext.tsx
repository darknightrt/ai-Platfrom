"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { STORAGE_TYPE } from '@/lib/storage.types';

interface AnnouncementConfig {
  enabled: boolean;
  title: string;
  content: string;
}

interface PromptsPageConfig {
  title: string;
  description: string;
}

interface WorkflowsPageConfig {
  title: string;
  description: string;
}

interface AutoCleanupConfig {
  enabled: boolean;
  retentionDays: number;
}

interface UserSettingsConfig {
  allowRegistration: boolean;
  userCount: number;
  autoCleanup: AutoCleanupConfig;
}

interface InviteCodeConfig {
  enabled: boolean;
  code: string;
}

export interface SiteConfig {
  /*提示词管理页面有用户设置 站点设置 邀请码设置 */
  homeTitle: string;
  typewriterTexts: string[];
  announcement: AnnouncementConfig;
  promptsPage: PromptsPageConfig;
  workflowsPage: WorkflowsPageConfig;
  userSettings: UserSettingsConfig;
  inviteCode: InviteCodeConfig;
}

const DEFAULT_CONFIG: SiteConfig = {
  homeTitle: "掌握与AI对话的<br/>",
  typewriterTexts: ["终极艺术", "顶级技巧", "思维能力"],
  announcement: {
    enabled: true,
    title: "🎉 欢迎来到 PromptMaster",
    content: "这是一个全新的 AI 提示词管理平台。现在支持管理员在线编辑所有内容！"
  },
  promptsPage: {
    title: "提示词指南",
    description: "发现复制高质量的ai提示词,高效完成你的ai创意"
  },
  workflowsPage: {
    title: "工作流库",
    description: "探索精选的 AI 工作流模板，包括 n8n、ComfyUI、Dify 等平台的自动化流程，助你快速搭建智能工作流。"
  },
  userSettings: {
    allowRegistration: true,
    userCount: 0,
    autoCleanup: {
      enabled: false,
      retentionDays: 30
    }
  },
  inviteCode: {
    enabled: false,
    code: ""
  }
};

interface SiteConfigContextType {
  config: SiteConfig;
  updateConfig: (newConfig: Partial<SiteConfig>) => void;
  resetConfig: () => void;
  isLoading: boolean;
  syncFromServer: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

/**
 * 深度合并配置对象
 */
function deepMergeConfig(defaultConfig: SiteConfig, loadedConfig: Partial<SiteConfig>): SiteConfig {
  return {
    ...defaultConfig,
    ...loadedConfig,
    promptsPage: { ...defaultConfig.promptsPage, ...(loadedConfig.promptsPage || {}) },
    workflowsPage: { ...defaultConfig.workflowsPage, ...(loadedConfig.workflowsPage || {}) },
    userSettings: { 
      ...defaultConfig.userSettings, 
      ...(loadedConfig.userSettings || {}), 
      autoCleanup: { 
        ...defaultConfig.userSettings.autoCleanup, 
        ...(loadedConfig.userSettings?.autoCleanup || {}) 
      } 
    },
    inviteCode: { ...defaultConfig.inviteCode, ...(loadedConfig.inviteCode || {}) }
  };
}

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 从服务器同步配置（仅 D1 模式）
   */
  const syncFromServer = useCallback(async () => {
    if (STORAGE_TYPE !== 'd1') return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const serverConfig = result.data as Partial<SiteConfig>;
          setConfig(prev => deepMergeConfig(prev, serverConfig));
        }
      }
    } catch (error) {
      console.error('Failed to sync config from server:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 保存配置到服务器（仅 D1 模式）
   */
  const saveToServer = useCallback(async (newConfig: SiteConfig) => {
    if (STORAGE_TYPE !== 'd1') return;
    
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      console.error('Failed to save config to server:', error);
    }
  }, []);

  // 初始化：加载配置
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      
      if (STORAGE_TYPE === 'd1') {
        // D1 模式：从服务器加载
        try {
          const response = await fetch('/api/admin/settings');
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && Object.keys(result.data).length > 0) {
              const serverConfig = result.data as Partial<SiteConfig>;
              setConfig(deepMergeConfig(DEFAULT_CONFIG, serverConfig));
            }
          }
        } catch (error) {
          console.error('Failed to load config from server:', error);
        }
      } else {
        // localStorage 模式：从本地加载
        const stored = localStorage.getItem('site_config');
        if (stored) {
          try {
            const loadedConfig = JSON.parse(stored);
            setConfig(deepMergeConfig(DEFAULT_CONFIG, loadedConfig));
          } catch (e) {
            console.error('Failed to load site config', e);
          }
        }
      }
      
      setIsLoaded(true);
      setIsLoading(false);
    };
    
    loadConfig();
  }, []);

  // 配置变更时保存
  useEffect(() => {
    if (!isLoaded) return;
    
    if (STORAGE_TYPE === 'd1') {
      // D1 模式：保存到服务器
      saveToServer(config);
    } else {
      // localStorage 模式：保存到本地
      localStorage.setItem('site_config', JSON.stringify(config));
    }
  }, [config, isLoaded, saveToServer]);

  const updateConfig = useCallback((newConfig: Partial<SiteConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return (
    <SiteConfigContext.Provider value={{ config, updateConfig, resetConfig, isLoading, syncFromServer }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export const useSiteConfig = () => {
  const context = useContext(SiteConfigContext);
  if (!context) throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  return context;
};
