"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import slugify from "slugify";
import {
  ChevronLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  FolderOpen,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { mockTags } from "@/lib/mock-detail-data";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  order: number;
}

// 表单验证 schema
const uploadSkillSchema = z.object({
  name: z.string().min(1, "技能名称不能为空").max(100, "技能名称不能超过100字符"),
  slug: z.string().min(1, "Slug不能为空").max(100, "Slug不能超过100字符"),
  description: z.string().min(1, "描述不能为空").max(500, "描述不能超过500字符"),
  categoryId: z.string().min(1, "请选择分类"),
  version: z.string().optional().default("1.0.0"),
});

type UploadSkillFormData = z.infer<typeof uploadSkillSchema>;

// 上传文件类型
interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isMarkdown: boolean;
  content?: string;
}

export default function UploadSkillPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 加载分类数据
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setCategories(result.data);
          }
        } else {
          toast.error("加载分类失败");
        }
      } catch (error) {
        console.error("Load categories error:", error);
        toast.error("加载分类失败");
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(uploadSkillSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      version: "1.0.0",
    },
  });

  const nameValue = watch("name");

  // 检查文件是否为 Markdown
  const isMarkdownFile = (filename: string) => {
    return filename.toLowerCase().endsWith('.md') || 
           filename.toLowerCase().endsWith('.markdown') ||
           filename.toLowerCase().endsWith('.txt');
  };

  // 从文件名提取技能名称
  const extractSkillName = (filename: string) => {
    return filename
      .replace(/\.(md|markdown|txt|doc|docx|pdf)$/i, '')
      .replace(/[-_]/g, ' ')
      .trim();
  };

  // 读取文件内容
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // 处理文件添加
  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: UploadFile[] = [];
    
    for (const file of Array.from(fileList)) {
      // 检查文件是否已存在
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        continue;
      }

      const isMd = isMarkdownFile(file.name);
      let content = '';
      
      if (isMd && file.size < 1024 * 1024) { // 小于 1MB 才读取内容
        try {
          content = await readFileContent(file);
        } catch {
          // 读取失败不阻止上传
        }
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        isMarkdown: isMd,
        content,
      });

      // 如果是第一个文件且名称字段为空，自动填充
      if (files.length === 0 && newFiles.length === 1 && !nameValue) {
        const extractedName = extractSkillName(file.name);
        setValue("name", extractedName);
        setValue("slug", slugify(extractedName, { lower: true, strict: true }));
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    if (newFiles.length > 0) {
      toast.success(`已添加 ${newFiles.length} 个文件`);
    }
  }, [files, nameValue, setValue]);

  // 删除文件
  const handleRemoveFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // 添加标签
  const handleAddTag = (tagName: string) => {
    if (tagName && !selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setTagInput("");
  };

  // 移除标签
  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tagName));
  };

  // 自动生成 slug
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    if (!watch("slug")) {
      setValue("slug", slugify(name, { lower: true, strict: true }));
    }
  }, [setValue, watch]);

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // 获取文件图标
  const getFileIcon = (type: string, name: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (name.toLowerCase().endsWith('.pdf')) return <FileText className="h-4 w-4" />;
    if (isMarkdownFile(name)) return <FileText className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4" />;
  };

  // 提交表单
  const onSubmit = async (data: UploadSkillFormData) => {
    if (files.length === 0) {
      toast.error("请至少上传一个文件");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("slug", data.slug);
      formData.append("description", data.description);
      formData.append("categoryId", data.categoryId);
      formData.append("version", data.version);
      formData.append("tags", JSON.stringify(selectedTags));

      // 添加所有文件
      files.forEach((file) => {
        formData.append("files", file.file);
      });

      const response = await fetch("/api/skills/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        const detail = error.details ? ` (${error.details})` : '';
        throw new Error((error.error || "上传失败") + detail);
      }

      const result = await response.json();
      toast.success("技能发布成功");
      router.push(`/skills/${data.slug}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <a 
        href="/skills" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        返回技能列表
      </a>

      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">上传 Skill</h1>
        <p className="text-muted-foreground mt-1">
          上传文件或文件夹来发布技能
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* 文件上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
            <CardDescription>支持拖拽上传、点击选择文件或上传整个文件夹</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 拖拽上传区域 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                拖拽文件到此处，或选择上传方式
              </p>
              <div className="flex items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  accept=".md,.txt,.doc,.docx,.pdf,image/*"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is a non-standard attribute for folder selection
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  选择文件
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  选择文件夹
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                支持 .md, .txt, .doc, .docx, .pdf, 图片等格式
              </p>
            </div>

            {/* 文件列表 */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>已选择文件 ({files.length})</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(file.type, file.name)}
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                        {file.isMarkdown && (
                          <Badge variant="secondary" className="text-xs shrink-0">Markdown</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.isMarkdown && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewFile(file)}
                            title="预览"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveFile(file.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>填写技能的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 技能名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                技能名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="输入技能名称"
                {...register("name", { onChange: handleNameChange })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="skill-slug"
                {...register("slug")}
              />
              <p className="text-xs text-muted-foreground">
                用于 URL 的标识符，只能包含小写字母、数字和连字符
              </p>
              {errors.slug && (
                <p className="text-sm text-red-500">{errors.slug.message}</p>
              )}
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">
                描述 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="简要描述这个技能的功能和用途"
                rows={3}
                {...register("description")}
              />
              <p className="text-xs text-muted-foreground">
                {watch("description")?.length || 0}/500 字符
              </p>
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* 分类和版本 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  分类 <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <span className="flex-1 text-left truncate">
                          {field.value
                            ? categories.find((c) => c.id === field.value)?.name || "选择分类"
                            : "选择分类"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCategories ? (
                          <SelectItem value="loading" disabled>
                            加载中...
                          </SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">版本号</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  {...register("version")}
                />
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label>标签</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="输入标签名称，按回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddTag(tagInput)}
                >
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-muted-foreground">推荐标签：</span>
                {mockTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.name)}
                    className="text-xs text-primary hover:underline"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push("/skills")}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            发布技能
          </Button>
        </div>
      </form>

      {/* 文件预览对话框 */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{previewFile.name}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                {previewFile.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
