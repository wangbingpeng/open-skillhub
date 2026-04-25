"use client";

import { useState, useCallback, useRef } from "react";
import {
  RefreshCw,
  Upload,
  Sparkles,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { toast } from "sonner";

const USAGE_SEPARATOR = "<!-- USAGE_START -->";

interface UpdateSkillDialogProps {
  slug: string;
  name: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type UpdateMode = "upload" | "generate";

export function UpdateSkillDialog({
  slug,
  name,
  description,
  open,
  onOpenChange,
  onSuccess,
}: UpdateSkillDialogProps) {
  const [mode, setMode] = useState<UpdateMode>("generate");
  const [content, setContent] = useState("");
  const [installation, setInstallation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedContent, setUploadedContent] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传文件解析
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadFileName(file.name);

      // 检查是否为文本文件
      const ext = file.name.toLowerCase().split(".").pop();
      const textExts = ["md", "markdown", "txt"];
      if (!textExts.includes(ext || "")) {
        toast.error("仅支持 .md / .txt 文件上传");
        return;
      }

      try {
        const text = await file.text();
        // 尝试分离使用说明
        const separatorIdx = text.indexOf(USAGE_SEPARATOR);
        if (separatorIdx !== -1) {
          setUploadedContent(text.substring(0, separatorIdx).trimEnd());
          setInstallation(
            text.substring(separatorIdx + USAGE_SEPARATOR.length).trim()
          );
        } else {
          setUploadedContent(text);
          setInstallation("");
        }
        setContent(text);
        toast.success(`已读取文件: ${file.name}`);
      } catch {
        toast.error("文件读取失败");
      }
    },
    []
  );

  // AI 生成
  const handleAIGenerate = useCallback(async () => {
    if (!name.trim() || !description.trim()) {
      toast.error("技能名称和描述不能为空");
      return;
    }

    setIsGenerating(true);
    let generatedContent = "";

    try {
      const response = await fetch("/api/ai/generate-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

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
            const data = JSON.parse(trimmedLine.slice(6));
            if (data.type === "chunk" && data.content) {
              generatedContent += data.content;
              const separatorIdx = generatedContent.indexOf(USAGE_SEPARATOR);
              if (separatorIdx === -1) {
                setContent(generatedContent);
              } else {
                setContent(
                  generatedContent.substring(0, separatorIdx).trimEnd()
                );
              }
            } else if (data.type === "error") {
              throw new Error(data.error || "生成失败");
            } else if (data.type === "done") {
              const separatorIdx = generatedContent.indexOf(USAGE_SEPARATOR);
              if (separatorIdx !== -1) {
                setContent(
                  generatedContent.substring(0, separatorIdx).trimEnd()
                );
                const usage = generatedContent
                  .substring(separatorIdx + USAGE_SEPARATOR.length)
                  .trim();
                if (usage) setInstallation(usage);
              }
              toast.success("AI 生成完成");
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      reader.releaseLock();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI 生成失败"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [name, description]);

  // 提交更新
  const handleSubmit = async () => {
    const finalContent =
      mode === "upload" ? uploadedContent : content;
    if (!finalContent.trim()) {
      toast.error("技能内容不能为空");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/skills/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: finalContent,
          installation: installation || undefined,
          changelog: `通过${mode === "upload" ? "文件上传" : "AI生成"}更新技能内容`,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "更新失败");
      }

      toast.success("技能更新成功");
      onOpenChange(false);
      resetState();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "技能更新失败"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setContent("");
    setInstallation("");
    setUploadedContent("");
    setUploadFileName("");
    setMode("generate");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    onOpenChange(newOpen);
  };

  const displayContent =
    mode === "upload" ? uploadedContent : content;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            更新技能: {name}
          </DialogTitle>
          <DialogDescription>
            通过上传文件或 AI 生成的方式更新技能内容，更新后将覆盖原有内容
          </DialogDescription>
        </DialogHeader>

        {/* 模式切换 */}
        <div className="flex gap-2 py-2">
          <Button
            type="button"
            variant={mode === "generate" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => setMode("generate")}
          >
            <Sparkles className="h-4 w-4" />
            AI 生成
          </Button>
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => setMode("upload")}
          >
            <Upload className="h-4 w-4" />
            上传文件
          </Button>
        </div>

        {/* AI 生成模式 */}
        {mode === "generate" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>技能内容</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={isGenerating || !name.trim() || !description.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isGenerating ? "生成中..." : "AI 生成内容"}
              </Button>
            </div>
            <div className="min-h-[300px] rounded-md border">
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="点击「AI 生成内容」或直接编辑技能内容..."
              />
            </div>
          </div>
        )}

        {/* 上传文件模式 */}
        {mode === "upload" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>上传技能文件</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  选择文件
                </Button>
                {uploadFileName && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {uploadFileName}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFileName("");
                        setUploadedContent("");
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                支持 .md / .txt 文件，文件内容将覆盖技能内容
              </p>
            </div>
            {uploadedContent && (
              <div className="space-y-2">
                <Label>内容预览</Label>
                <Textarea
                  value={uploadedContent}
                  onChange={(e) => setUploadedContent(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* 使用说明（两种模式共享） */}
        {installation !== undefined && displayContent && (
          <div className="space-y-2">
            <Label>安装和使用说明</Label>
            <Textarea
              value={installation}
              onChange={(e) => setInstallation(e.target.value)}
              rows={4}
              placeholder="安装和使用说明（可选）"
              className="font-mono text-sm"
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            取消
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !displayContent.trim()}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            确认更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
