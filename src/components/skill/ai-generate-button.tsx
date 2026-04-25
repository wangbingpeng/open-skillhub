"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const USAGE_SEPARATOR = "<!-- USAGE_START -->";

interface AIGenerateButtonProps {
  name: string;
  description: string;
  onGenerate: (content: string) => void;
  onGenerateUsage?: (usage: string) => void;
  disabled?: boolean;
}

/**
 * AI 生成文档按钮组件
 * 处理流式响应，逐步更新编辑器内容
 */
export function AIGenerateButton({
  name,
  description,
  onGenerate,
  onGenerateUsage,
  disabled = false,
}: AIGenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // 组件挂载时检查 AI 是否已配置
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/ai/status");
        if (response.ok) {
          const data = await response.json();
          setIsConfigured(data.configured);
        } else {
          setIsConfigured(false);
        }
      } catch {
        setIsConfigured(false);
      }
    };
    checkStatus();
  }, []);

  // 检查 AI 是否已配置（备用方法）
  const checkAIConfig = async (): Promise<boolean> => {
    if (isConfigured !== null) return isConfigured;

    try {
      const response = await fetch("/api/ai/status");
      if (response.ok) {
        const data = await response.json();
        setIsConfigured(data.configured);
        return data.configured;
      }
      setIsConfigured(false);
      return false;
    } catch {
      setIsConfigured(false);
      return false;
    }
  };

  const handleGenerate = async () => {
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
    let generatedContent = "";

    try {
      const response = await fetch("/api/ai/generate-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("AI 服务未配置");
        }
        if (response.status === 401) {
          throw new Error("请先登录");
        }
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;

          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);

            if (data.type === "chunk" && data.content) {
              generatedContent += data.content;
              // 实时更新：只把分隔符之前的内容填充到技能内容
              const separatorIdx = generatedContent.indexOf(USAGE_SEPARATOR);
              if (separatorIdx === -1) {
                onGenerate(generatedContent);
              } else {
                onGenerate(generatedContent.substring(0, separatorIdx).trimEnd());
              }
            } else if (data.type === "error") {
              throw new Error(data.error || "生成失败");
            } else if (data.type === "done") {
              // 生成完成后，解析并分离使用说明
              const separatorIdx = generatedContent.indexOf(USAGE_SEPARATOR);
              if (separatorIdx !== -1) {
                const skillContent = generatedContent.substring(0, separatorIdx).trimEnd();
                const usageContent = generatedContent.substring(separatorIdx + USAGE_SEPARATOR.length).trim();
                onGenerate(skillContent);
                if (onGenerateUsage && usageContent) {
                  onGenerateUsage(usageContent);
                }
              }
              toast.success("文档生成完成");
            }
          } catch (parseError) {
            // 忽略解析错误
          }
        }
      }

      reader.releaseLock();
    } catch (error) {
      console.error("Generate error:", error);
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsLoading(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={disabled || isLoading || !name.trim() || !description.trim()}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {isLoading ? "生成中..." : "AI生成skill"}
    </Button>
  );

  // 如果正在检查配置，显示加载状态
  if (isConfigured === null) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="gap-2"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        检查配置...
      </Button>
    );
  }

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
                <Sparkles className="h-4 w-4" />
                AI生成skill
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
