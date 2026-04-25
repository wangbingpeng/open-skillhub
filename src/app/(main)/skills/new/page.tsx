"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import slugify from "slugify";
import { 
  ChevronLeft, 
  Loader2, 
  Upload, 
  X, 
  FileText,
  Image as ImageIcon,
  File,
  Info
} from "lucide-react";
import { AIGenerateButton } from "@/components/skill/ai-generate-button";
import { AITagSuggest } from "@/components/skill/ai-tag-suggest";
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
import { MarkdownEditor } from "@/components/editor/markdown-editor";
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
const skillFormSchema = z.object({
  name: z.string().min(1, "技能名称不能为空").max(100, "技能名称不能超过100字符"),
  slug: z.string().min(1, "Slug不能为空").max(100, "Slug不能超过100字符"),
  description: z.string().min(1, "描述不能为空").max(500, "描述不能超过500字符"),
  categoryId: z.string().min(1, "请选择分类"),
  version: z.string().optional().default("1.0.0"),
  content: z.string().min(1, "技能内容不能为空"),
  installation: z.string().optional(),
});

type SkillFormData = z.infer<typeof skillFormSchema>;

// 上传文件类型
interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export default function CreateSkillPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      version: "1.0.0",
      content: "",
      installation: "",
    },
  });

  const nameValue = watch("name");

  // 自动生成 slug
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    if (!watch("slug")) {
      setValue("slug", slugify(name, { lower: true, strict: true }));
    }
  }, [setValue, watch]);

  // 添加标签
  const handleAddTag = (tagName: string) => {
    if (tagName && !selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setTagInput("");
  };

  // 移除标签
  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  // 处理文件上传
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("上传失败");
        }

        const data = await response.json();
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random().toString(),
            filename: data.filename,
            url: data.url,
            size: data.size,
            mimeType: data.mimeType,
          },
        ]);
        toast.success(`文件 "${file.name}" 上传成功`);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`文件 "${file.name}" 上传失败`);
      }
    }
  };

  // 删除已上传文件
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
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
    handleFileUpload(e.dataTransfer.files);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (mimeType === "application/pdf") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // 提交表单
  const onSubmit = async (data: SkillFormData, isDraft: boolean = false) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tagIds: selectedTags,
          status: isDraft ? "DRAFT" : "PUBLISHED",
          attachments: uploadedFiles,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.details 
          ? `${error.error}: ${error.details.map((d: { message: string }) => d.message).join(', ')}`
          : (error.error || "创建失败");
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success(isDraft ? "草稿保存成功" : "技能发布成功");
      
      // 跳转到技能详情页
      router.push(`/skills/${data.slug}`);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <a href="/skills" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" />
        返回技能列表
      </a>

      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">生成 Skill</h1>
        <p className="text-muted-foreground mt-1">
          使用 Markdown 编辑器在线创建和编辑技能内容
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
          <Info className="h-4 w-4 flex-shrink-0" />
          如果要基于AI生成，需先填写<span className="font-semibold underline underline-offset-2">技能名称</span>和<span className="font-semibold underline underline-offset-2">描述</span>
        </p>
      </div>

      <form className="space-y-6">
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
              <div className="flex items-center justify-between">
                <Label>标签</Label>
                <AITagSuggest
                  name={nameValue}
                  description={watch("description")}
                  content={watch("content")}
                  onSuggest={(tags) => {
                    const newTags = tags.filter(
                      (tag) => !selectedTags.includes(tag)
                    );
                    if (newTags.length > 0) {
                      setSelectedTags([...selectedTags, ...newTags]);
                      toast.success(`已添加 ${newTags.length} 个标签`);
                    }
                  }}
                />
              </div>
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

        {/* 技能内容 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>技能内容</CardTitle>
                <CardDescription>使用 Markdown 格式编写技能详情</CardDescription>
              </div>
              <AIGenerateButton
                name={nameValue}
                description={watch("description")}
                onGenerate={(content) => setValue("content", content)}
                onGenerateUsage={(usage) => setValue("installation", usage)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                内容 <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <MarkdownEditor
                    value={field.value}
                    onChange={field.onChange}
                    height={400}
                    placeholder="输入技能内容，支持 Markdown 格式..."
                  />
                )}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>使用说明（可选）</Label>
              <Controller
                name="installation"
                control={control}
                render={({ field }) => (
                  <MarkdownEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    height={200}
                    placeholder="输入安装和使用说明..."
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 附件上传 */}
        <Card>
          <CardHeader>
            <CardTitle>附件</CardTitle>
            <CardDescription>上传相关文件（图片、文档等）</CardDescription>
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
              <p className="text-sm text-muted-foreground mb-2">
                拖拽文件到此处，或
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                选择文件
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                支持图片、PDF、Markdown、文本文件，单个文件最大 10MB
              </p>
            </div>

            {/* 已上传文件列表 */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>已上传文件</Label>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(file.mimeType)}
                        <span className="text-sm truncate">{file.filename}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleRemoveFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, true))}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            保存草稿
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, false))}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            发布技能
          </Button>
        </div>
      </form>
    </div>
  );
}
