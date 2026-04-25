"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface AITagSuggestProps {
  name: string;
  description: string;
  content?: string;
  onSuggest: (tags: string[]) => void;
  disabled?: boolean;
}

/**
 * AI 智能推荐标签按钮组件
 * 调用标签推荐 API，自动添加推荐的标签
 */
export function AITagSuggest({
  name,
  description,
  content,
  onSuggest,
  disabled = false,
}: AITagSuggestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // 检查 AI 是否已配置
  const checkAIConfig = async (): Promise<boolean> => {
    if (isConfigured !== null) return isConfigured;

    try {
      const response = await fetch("/api/ai/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test", description: "test" }),
      });

      if (response.status === 503) {
        setIsConfigured(false);
        return false;
      }
      setIsConfigured(true);
      return true;
    } catch {
      setIsConfigured(true);
      return true;
    }
  };

  const handleSuggest = async () => {
    if (!name.trim()) {
      toast.error("请先填写技能名称");
      return;
    }

    if (!description.trim()) {
      toast.error("请先填写技能描述");
      return;
    }

    const configured = await checkAIConfig();
    if (!configured) {
      toast.error("AI 服务未配置，请联系管理员");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          content: content?.slice(0, 1000), // 只发送前1000字符
        }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("AI 服务未配置");
        }
        if (response.status === 401) {
          throw new Error("请先登录");
        }
        const error = await response.json();
        throw new Error(error.error || "推荐失败");
      }

      const data = await response.json();
      const tags: string[] = data.tags || [];

      if (tags.length === 0) {
        toast.info("未推荐到相关标签");
        return;
      }

      onSuggest(tags);
      toast.success(`已推荐 ${tags.length} 个标签`);
    } catch (error) {
      console.error("Suggest tags error:", error);
      toast.error(error instanceof Error ? error.message : "推荐失败");
    } finally {
      setIsLoading(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSuggest}
      disabled={disabled || isLoading || !name.trim() || !description.trim()}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {isLoading ? "推荐中..." : "智能推荐标签"}
    </Button>
  );

  // 如果未配置，显示 tooltip
  if (isConfigured === false) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                智能推荐标签
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI 服务未配置，请联系管理员配置 DASHSCOPE_API_KEY</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
