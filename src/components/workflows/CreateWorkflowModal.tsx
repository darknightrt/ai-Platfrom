"use client";

import { useState, useRef, useEffect } from 'react';
import { WorkflowItem, WorkflowCategory, WorkflowComplexity } from '@/lib/types';
import { useWorkflows } from '@/context/WorkflowContext';
import { useToast } from '@/context/ToastContext';

// 图片输入模式类型
type ImageInputMode = 'url' | 'upload';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: WorkflowItem | null;
}

const CATEGORIES: { value: WorkflowCategory; label: string }[] = [
  { value: 'n8n', label: 'n8n' },
  { value: 'comfyui', label: 'ComfyUI' },
  { value: 'dify', label: 'Dify' },
  { value: 'other', label: '其他' },
];

const COMPLEXITIES: { value: WorkflowComplexity; label: string; color: string }[] = [
  { value: 'beginner', label: '初级', color: 'bg-green-600' },
  { value: 'intermediate', label: '中级', color: 'bg-yellow-500' },
  { value: 'advanced', label: '高级', color: 'bg-red-600' },
];

export default function CreateWorkflowModal({ 
  isOpen, 
  onClose,
  editData 
}: CreateWorkflowModalProps) {
  const { addWorkflow, updateWorkflow } = useWorkflows();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detail: '',
    category: 'n8n' as WorkflowCategory,
    complexity: 'beginner' as WorkflowComplexity,
    images: [''],
    workflowJson: '',
    downloadUrl: '',
  });

  // 图片输入模式状态：每个图片槽位独立控制
  const [imageInputModes, setImageInputModes] = useState<ImageInputMode[]>(['url']);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const imageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (editData) {
      const imageCount = editData.images.length > 0 ? editData.images.length : 1;
      setFormData({
        title: editData.title,
        description: editData.description,
        detail: editData.detail || '',
        category: editData.category,
        complexity: editData.complexity || 'beginner',
        images: editData.images.length > 0 ? editData.images : [''],
        workflowJson: editData.workflowJson || '',
        downloadUrl: editData.downloadUrl || '',
      });
      // 编辑时默认使用链接模式
      setImageInputModes(Array(imageCount).fill('url'));
    } else {
      setFormData({
        title: '',
        description: '',
        detail: '',
        category: 'n8n',
        complexity: 'beginner',
        images: [''],
        workflowJson: '',
        downloadUrl: '',
      });
      setImageInputModes(['url']);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const addImageField = () => {
    if (formData.images.length < 4) {
      setFormData({ ...formData, images: [...formData.images, ''] });
      setImageInputModes([...imageInputModes, 'url']);
    }
  };

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      const newModes = imageInputModes.filter((_, i) => i !== index);
      setFormData({ ...formData, images: newImages });
      setImageInputModes(newModes);
    }
  };

  // 切换图片输入模式
  const toggleImageInputMode = (index: number) => {
    const newModes = [...imageInputModes];
    newModes[index] = newModes[index] === 'url' ? 'upload' : 'url';
    setImageInputModes(newModes);
  };

  // 处理图片上传
  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('图片大小不能超过 5MB', 'error');
      return;
    }

    setUploadingIndex(index);

    try {
      // 将图片转换为 Base64 Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleImageChange(index, dataUrl);
        setUploadingIndex(null);
        showToast('图片已加载', 'success');
      };
      reader.onerror = () => {
        showToast('图片加载失败', 'error');
        setUploadingIndex(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast('图片上传失败', 'error');
      setUploadingIndex(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData({ ...formData, workflowJson: content });
        showToast('工作流文件已加载', 'success');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证
    if (!formData.title.trim()) {
      showToast('请输入工作流标题', 'error');
      return;
    }
    if (!formData.description.trim()) {
      showToast('请输入工作流简介', 'error');
      return;
    }
    const validImages = formData.images.filter(img => img.trim());
    if (validImages.length === 0) {
      showToast('请至少添加一张预览图片', 'error');
      return;
    }

    const workflowData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      detail: formData.detail.trim(),
      category: formData.category,
      complexity: formData.complexity,
      images: validImages,
      workflowJson: formData.workflowJson,
      downloadUrl: formData.downloadUrl.trim(),
    };

    if (editData) {
      updateWorkflow(editData.id, workflowData);
      showToast('工作流已更新', 'success');
    } else {
      addWorkflow(workflowData);
      showToast('工作流已创建', 'success');
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editData ? '编辑工作流' : '创建工作流'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="输入工作流标题"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    formData.category === cat.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 复杂度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              复杂度 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPLEXITIES.map((comp) => (
                <button
                  key={comp.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, complexity: comp.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    formData.complexity === comp.value
                      ? `${comp.color} text-white`
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {comp.label}
                </button>
              ))}
            </div>
          </div>

          {/* 简介 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              简介 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="简要描述工作流的功能"
            />
          </div>

          {/* 详细说明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              详细说明
            </label>
            <textarea
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="详细的使用说明（可选）"
            />
          </div>

          {/* 图片链接/上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              预览图片 <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(最多4张，支持链接或上传)</span>
            </label>
            <div className="space-y-3">
              {formData.images.map((img, index) => (
                <div key={index} className="space-y-2">
                  {/* 模式切换按钮 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">图片 {index + 1}:</span>
                    <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => toggleImageInputMode(index)}
                        className={`px-3 py-1 text-xs rounded-md transition ${
                          imageInputModes[index] === 'url'
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <i className="fa-solid fa-link mr-1"></i>
                        链接
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleImageInputMode(index)}
                        className={`px-3 py-1 text-xs rounded-md transition ${
                          imageInputModes[index] === 'upload'
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <i className="fa-solid fa-upload mr-1"></i>
                        上传
                      </button>
                    </div>
                  </div>

                  {/* 输入区域 */}
                  <div className="flex gap-2">
                    {imageInputModes[index] === 'url' ? (
                      <input
                        type="url"
                        value={img}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="输入图片链接"
                      />
                    ) : (
                      <div className="flex-1">
                        <input
                          ref={(el) => { imageInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(index, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRefs.current[index]?.click()}
                          disabled={uploadingIndex === index}
                          className="w-full px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 transition flex items-center justify-center gap-2"
                        >
                          {uploadingIndex === index ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin"></i>
                              上传中...
                            </>
                          ) : img && img.startsWith('data:') ? (
                            <>
                              <i className="fa-solid fa-check text-green-500"></i>
                              <span className="text-green-500">已上传</span>
                              <span className="text-xs">(点击更换)</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-cloud-arrow-up"></i>
                              点击选择图片
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageField(index)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>

                  {/* 图片预览 */}
                  {img && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
                      <img
                        src={img}
                        alt={`预览 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {formData.images.length < 4 && (
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-sm text-purple-500 hover:text-purple-400 flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus"></i>
                  添加图片
                </button>
              )}
            </div>
          </div>

          {/* 工作流文件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              工作流 JSON 文件
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition flex items-center gap-2"
              >
                <i className="fa-solid fa-upload"></i>
                上传文件
              </button>
              {formData.workflowJson && (
                <span className="flex items-center text-sm text-green-500">
                  <i className="fa-solid fa-check mr-1"></i>
                  已加载
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* 下载链接 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              外部下载链接
            </label>
            <input
              type="url"
              value={formData.downloadUrl}
              onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="外部下载链接（可选）"
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition"
            >
              {editData ? '保存修改' : '创建工作流'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
