"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "昵称不能为空").max(50, "昵称最多50字"),
  department: z.string().max(100, "部门最多100字").optional(),
  bio: z.string().max(500, "简介最多500字").optional(),
});

type FormData = z.infer<typeof formSchema>;

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

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile;
}

async function updateProfile(data: FormData): Promise<void> {
  const response = await fetch("/api/user/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "更新失败");
  }
}

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
}: EditProfileDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      department: user.department || "",
      bio: user.bio || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("资料更新成功");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "更新失败");
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  // 关闭时重置表单
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset({
        name: user.name,
        department: user.department || "",
        bio: user.bio || "",
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
          <DialogDescription>
            修改你的个人信息，让其他人更好地了解你
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 昵称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              昵称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="输入你的昵称..."
              {...register("name")}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* 部门 */}
          <div className="space-y-2">
            <Label htmlFor="department">部门</Label>
            <Input
              id="department"
              placeholder="输入你所在的部门..."
              {...register("department")}
              className={errors.department ? "border-destructive" : ""}
            />
            {errors.department && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.department.message}
              </p>
            )}
          </div>

          {/* 简介 */}
          <div className="space-y-2">
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              placeholder="简单介绍一下自己..."
              rows={4}
              {...register("bio")}
              className={errors.bio ? "border-destructive" : ""}
            />
            {errors.bio && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.bio.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              最多 500 字
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
