"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  File
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
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { toast } from "sonner";

interface SkillTag {
  id: string;
  name: string;
}

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
  version: z.string().default("1.0.0"),
  content: z.string().min(1, "技能内容不能为空"),
  installation: z.string().optional(),
  changelog: z.string().optional(),
});

type SkillFormData = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  version: string;
  content: string;
  installation?: string;
  changelog?: string;
};

// 上传文件类型
interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

interface EditSkillPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function EditSkillPage({ params }: EditSkillPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<SkillTag[]>([]);
  const [currentVersion, setCurrentVersion] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [skillSlug, setSkillSlug] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SkillFormData>({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      version: "1.0.0",
      content: "",
      installation: "",
      changelog: "",
    },
  });

  // 加载技能数据
  useEffect(() => {
    const loadSkill = async () => {
      try {
        const { slug } = await params;
        setSkillSlug(slug);

        const response = await fetch(`/api/skills/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("技能不存在");
          } else {
            toast.error("加载技能失败");
          }
          router.push("/skills");
          return;
        }

        const result = await response.json();
        const skill = result.data;

        reset({
          name: skill.name,
          slug: skill.slug,
          description: skill.description,
          categoryId: skill.category?.id || "",
          version: skill.version,
          content: skill.content,
          installation: skill.installation || "",
          changelog: "",
        });
        setCurrentVersion(skill.version);

        const tagNames: string[] = [];
        const tagIds: string[] = [];
        if (skill.tags && Array.isArray(skill.tags)) {
          for (const t of skill.tags) {
            tagNames.push(t.name);
            tagIds.push(t.id);
          }
        }
        setSelectedTags(tagNames);
        setSelectedTagIds(tagIds);

        // 同时加载所有标签供推荐
        const tagsRes = await fetch("/api/skills");
        if (tagsRes.ok) {
          const tagsResult = await tagsRes.json();
          if (tagsResult.success && tagsResult.data) {
            const tagMap = new Map<string, SkillTag>();
            for (const s of tagsResult.data) {
              if (s.tags && Array.isArray(s.tags)) {
                for (const t of s.tags) {
                  tagMap.set(t.id, t);
                }
              }
            }
            setAllTags(Array.from(tagMap.values()));
          }
        }
      } catch (error) {
        console.error("Load skill error:", error);
        toast.error("加载技能失败");
        router.push("/skills");
      } finally {
        setIsLoading(false);
      }
    };

    loadSkill();
  }, [params, reset, router]);

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

  const nameValue = watch("name");

  // 自动生成 slug
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    // 编辑时不自动修改 slug，避免破坏已有链接
  }, [setValue]);

  // 添加标签
  const handleAddTag = (tagName: string, tagId?: string) => {
    if (tagName && !selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
      // 如果提供了 tagId 直接用，否则从 allTags 里查找
      const resolvedId = tagId || allTags.find((t) => t.name === tagName)?.id;
      if (resolvedId) {
        setSelectedTagIds([...selectedTagIds, resolvedId]);
      }
    }
    setTagInput("");
  };

  // 移除标签
  const handleRemoveTag = (tagName: string) => {
    const idx = selectedTags.indexOf(tagName);
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
    if (idx >= 0 && idx < selectedTagIds.length) {
      setSelectedTagIds(selectedTagIds.filter((_, i) => i !== idx));
    }
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
      const body: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        content: data.content,
        categoryId: data.categoryId,
        tagIds: selectedTagIds,
        changelog: data.changelog || undefined,
      };

      if (data.installation) {
        body.installation = data.installation;
      }

      if (!isDraft) {
        body.status = "PUBLISHED";
      }

      const response = await fetch(`/api/skills/${skillSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "更新失败");
      }

      toast.success(isDraft ? "草稿保存成功" : "技能更新成功");
      router.push(`/skills/${data.slug}`);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Link href={`/skills/${skillSlug}`}>
        <Button variant="ghost" className="pl-0">
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回技能详情
        </Button>
      </Link>

      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">编辑技能</h1>
        <p className="text-muted-foreground mt-1">
          更新你的技能信息
        </p>
      </div>

      <form className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>修改技能的基本信息</CardDescription>
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
                用于 URL 的标识符，修改后会影响已有链接
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
                <Label htmlFor="version">新版本号</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  {...register("version")}
                />
                <p className="text-xs text-muted-foreground">
                  当前版本：{currentVersion}
                </p>
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
                {allTags
                  .filter((t) => !selectedTags.includes(t.name))
                  .slice(0, 5)
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddTag(tag.name, tag.id)}
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
            <CardTitle>技能内容</CardTitle>
            <CardDescription>使用 Markdown 格式编写技能详情</CardDescription>
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

        {/* 变更日志 */}
        <Card>
          <CardHeader>
            <CardTitle>变更日志</CardTitle>
            <CardDescription>记录本次更新的内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="changelog">更新说明</Label>
              <Textarea
                id="changelog"
                placeholder="描述本次更新的内容，例如：修复了...、新增了..."
                rows={3}
                {...register("changelog")}
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
              <Label className="cursor-pointer">
                <Input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Button type="button" variant="outline" size="sm">
                  选择文件
                </Button>
              </Label>
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
            更新技能
          </Button>
        </div>
      </form>
    </div>
  );
}
