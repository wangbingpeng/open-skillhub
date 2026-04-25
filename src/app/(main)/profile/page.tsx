"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Building2,
  FileText,
  Heart,
  History,
  Edit,
  Loader2,
  ExternalLink,
  Trash2,
  Star,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { EditProfileDialog } from "./edit-profile-dialog";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  department: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
}

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  _count: {
    likes: number;
    favorites: number;
    comments: number;
  };
}

interface Favorite {
  id: string;
  skill: {
    id: string;
    name: string;
    slug: string;
    description: string;
    author: {
      name: string;
    };
  };
  createdAt: string;
}

interface Activity {
  id: string;
  type: "skill" | "comment" | "favorite";
  title: string;
  description: string;
  createdAt: string;
  link?: string;
}

async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch("/api/user/profile");
  if (!response.ok) {
    throw new Error("获取用户信息失败");
  }
  return response.json();
}

async function fetchUserSkills(): Promise<Skill[]> {
  const response = await fetch("/api/user/skills");
  if (!response.ok) {
    throw new Error("获取技能列表失败");
  }
  return response.json();
}

async function fetchUserFavorites(): Promise<Favorite[]> {
  const response = await fetch("/api/user/favorites");
  if (!response.ok) {
    throw new Error("获取收藏列表失败");
  }
  return response.json();
}

async function fetchUserActivities(): Promise<Activity[]> {
  const response = await fetch("/api/user/activities");
  if (!response.ok) {
    throw new Error("获取活动记录失败");
  }
  return response.json();
}

async function deleteSkill(id: string): Promise<void> {
  const response = await fetch(`/api/skills/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("删除失败");
  }
}

async function unfavoriteSkill(skillId: string): Promise<void> {
  const response = await fetch(`/api/skills/${skillId}/favorite`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("取消收藏失败");
  }
}

// 获取首字母头像颜色
function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// 状态标签
function StatusBadge({ status }: { status: Skill["status"] }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    DRAFT: { label: "草稿", variant: "secondary" },
    PUBLISHED: { label: "已发布", variant: "default" },
    ARCHIVED: { label: "已归档", variant: "outline" },
  };
  const { label, variant } = variants[status] || { label: status, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
  });

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ["user-skills"],
    queryFn: fetchUserSkills,
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: fetchUserFavorites,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["user-activities"],
    queryFn: fetchUserActivities,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => {
      toast.success("技能已删除");
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["user-activities"] });
    },
    onError: () => {
      toast.error("删除失败，请重试");
    },
  });

  const unfavoriteMutation = useMutation({
    mutationFn: unfavoriteSkill,
    onSuccess: () => {
      toast.success("已取消收藏");
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["user-activities"] });
    },
    onError: () => {
      toast.error("取消收藏失败，请重试");
    },
  });

  if (userLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">无法加载用户信息</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 个人信息区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* 头像 */}
            <Avatar className="h-20 w-20">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback
                  className={`text-2xl text-white ${getAvatarColor(user.name)}`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            {/* 用户信息 */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {user.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="h-4 w-4" />
                  编辑资料
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {user.department && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {user.department}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.username}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  注册于 {formatDate(user.createdAt)}
                </span>
              </div>

              {user.bio && (
                <p className="text-sm text-foreground">{user.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 选项卡内容 */}
      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="skills" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">我的技能</span>
            <span className="sm:hidden">技能</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">我的收藏</span>
            <span className="sm:hidden">收藏</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">贡献记录</span>
            <span className="sm:hidden">记录</span>
          </TabsTrigger>
        </TabsList>

        {/* 我的技能 Tab */}
        <TabsContent value="skills" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">我的技能</h2>
            <Link href="/skills/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                新建技能
              </Button>
            </Link>
          </div>

          {skillsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !skills || skills.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p>还没有发布技能</p>
              <Link href="/skills/new">
                <Button variant="link" size="sm">
                  去创建第一个技能
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <Card key={skill.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/skills/${skill.slug}`}>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                              {skill.name}
                            </h3>
                          </Link>
                          <StatusBadge status={skill.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {skill.description}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" />
                            {skill._count.favorites}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {skill._count.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {skill._count.comments}
                          </span>
                          <span>{formatDate(skill.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/skills/${skill.slug}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(skill.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 我的收藏 Tab */}
        <TabsContent value="favorites" className="mt-6">
          <h2 className="text-lg font-semibold mb-4">我的收藏</h2>

          {favoritesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !favorites || favorites.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Heart className="h-8 w-8" />
              <p>还没有收藏任何技能</p>
              <Link href="/skills">
                <Button variant="link" size="sm">
                  去发现技能
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((favorite) => (
                <Card key={favorite.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/skills/${favorite.skill.slug}`}>
                          <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                            {favorite.skill.name}
                          </h3>
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {favorite.skill.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>作者：{favorite.skill.author.name}</span>
                          <span>·</span>
                          <span>收藏于 {formatDate(favorite.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/skills/${favorite.skill.slug}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => unfavoriteMutation.mutate(favorite.skill.id)}
                          disabled={unfavoriteMutation.isPending}
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 贡献记录 Tab */}
        <TabsContent value="activities" className="mt-6">
          <h2 className="text-lg font-semibold mb-4">贡献记录</h2>

          {activitiesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <History className="h-8 w-8" />
              <p>暂无活动记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {activity.type === "skill" && <FileText className="h-4 w-4" />}
                      {activity.type === "comment" && <MessageSquare className="h-4 w-4" />}
                      {activity.type === "favorite" && <Heart className="h-4 w-4" />}
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 编辑资料弹窗 */}
      <EditProfileDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={user}
      />
    </div>
  );
}
