"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Loader2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

interface Skill {
  id: string;
  name: string;
  slug: string;
}

// 表单验证 schema
const postFormSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字"),
  content: z.string().min(1, "内容不能为空"),
  type: z.enum(["DISCUSSION", "REQUEST"]),
  skillId: z.string().optional(),
  tags: z.array(z.string()),
});

type PostFormData = z.infer<typeof postFormSchema>;

async function fetchSkills(): Promise<Skill[]> {
  const response = await fetch("/api/skills");
  if (!response.ok) {
    throw new Error("获取技能列表失败");
  }
  const data = await response.json();
  return data.data || [];
}

async function createPost(data: PostFormData) {
  const response = await fetch("/api/forum", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...data,
      tags: data.tags,
    }),
  });

  if (response.status === 401) {
    throw new Error("请先登录");
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "创建帖子失败");
  }

  return response.json();
}

export default function CreatePostPage() {
  const router = useRouter();
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "DISCUSSION",
      skillId: "",
      tags: [],
    },
  });

  const selectedTags = watch("tags");

  // 检查登录状态
  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("请先登录", {
        action: {
          label: "去登录",
          onClick: () => router.push("/login"),
        },
      });
      router.push("/login");
    }
  }, [status, router]);

  // 加载技能列表
  useEffect(() => {
    fetchSkills()
      .then((data) => {
        setSkills(data);
      })
      .catch((error) => {
        console.error("Failed to fetch skills:", error);
      })
      .finally(() => {
        setIsLoadingSkills(false);
      });
  }, []);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      if (selectedTags.length >= 5) {
        toast.error("最多添加5个标签");
        return;
      }
      setValue("tags", [...selectedTags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setValue(
      "tags",
      selectedTags.filter((t) => t !== tag)
    );
  };

  const onSubmit = async (data: PostFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createPost(data);
      toast.success("帖子发布成功");
      router.push(`/forum/${result.slug}`);
    } catch (error) {
      const err = error as Error;
      if (err.message === "请先登录") {
        toast.error("请先登录", {
          action: {
            label: "去登录",
            onClick: () => router.push("/login"),
          },
        });
      } else {
        toast.error(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Link
        href="/forum"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        返回论坛
      </Link>

      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">发布新帖子</h1>
        <p className="text-muted-foreground mt-1">
          分享你的想法或提出功能需求
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>填写帖子的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                标题 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="输入帖子标题"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* 类型和关联技能 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">类型</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISCUSSION">讨论</SelectItem>
                        <SelectItem value="REQUEST">需求</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill">关联技能（可选）</Label>
                <Controller
                  name="skillId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingSkills}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择关联的技能" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">无</SelectItem>
                        {skills.map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
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
                  id="tags"
                  placeholder="输入标签，按回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                >
                  添加
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                最多添加 5 个标签，按回车或点击添加按钮
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 内容 */}
        <Card>
          <CardHeader>
            <CardTitle>内容</CardTitle>
            <CardDescription>使用 Markdown 格式编写帖子内容</CardDescription>
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
                    placeholder="输入帖子内容，支持 Markdown 格式..."
                  />
                )}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-4">
          <Link href="/forum">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                发布中...
              </>
            ) : (
              "发布帖子"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
