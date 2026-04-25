"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// 动态导入 MDEditor，避免 SSR 问题
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  height = 400,
  placeholder = "输入 Markdown 内容...",
}: MarkdownEditorProps) {
  const [uploading, setUploading] = useState(false);

  // 处理图片上传
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("请上传图片文件");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("图片大小不能超过 10MB");
        return;
      }

      setUploading(true);
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
        const imageMarkdown = `\n![${file.name}](${data.url})\n`;
        
        // 在当前光标位置插入图片
        const newValue = value + imageMarkdown;
        onChange(newValue);
        
        toast.success("图片上传成功");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("图片上传失败");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange]
  );

  // 自定义工具栏按钮
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customToolbar: any[] = [
    {
      name: "image",
      keyCommand: "image",
      buttonProps: { "aria-label": "插入图片" },
      icon: (
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 hover:bg-muted disabled:opacity-50">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageUpload(file);
              }
            }}
          />
        </label>
      ),
    },
  ];

  return (
    <div data-color-mode="auto" className="w-full">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        visibleDragbar={true}
        hideToolbar={false}
        textareaProps={{
          placeholder,
        }}
        preview="edit"
        extraCommands={customToolbar}
      />
      <style jsx global>{`
        .w-md-editor {
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
        }
        .w-md-editor-toolbar {
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
        }
        .w-md-editor-toolbar ul li button {
          color: hsl(var(--foreground));
        }
        .w-md-editor-toolbar ul li button:hover {
          background: hsl(var(--accent));
        }
        .w-md-editor-content {
          background: hsl(var(--background));
        }
        .w-md-editor-text-pre > code,
        .w-md-editor-text-input {
          font-size: 14px !important;
          line-height: 1.6 !important;
        }
        .w-md-editor-text {
          color: hsl(var(--foreground));
        }
        .w-md-editor-preview {
          border-left: 1px solid hsl(var(--border));
        }
        .w-md-editor-preview .wmde-markdown {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .w-md-editor-preview .wmde-markdown pre {
          background: #0d1117;
        }
        /* 暗色模式适配 */
        [data-theme="dark"] .w-md-editor,
        [data-color-mode="dark"] .w-md-editor {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
        }
        [data-theme="dark"] .w-md-editor-toolbar,
        [data-color-mode="dark"] .w-md-editor-toolbar {
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        [data-theme="dark"] .w-md-editor-content,
        [data-color-mode="dark"] .w-md-editor-content {
          background: hsl(var(--background));
        }
        [data-theme="dark"] .w-md-editor-text,
        [data-color-mode="dark"] .w-md-editor-text {
          color: hsl(var(--foreground));
        }
        [data-theme="dark"] .w-md-editor-preview,
        [data-color-mode="dark"] .w-md-editor-preview {
          border-color: hsl(var(--border));
        }
        [data-theme="dark"] .w-md-editor-preview .wmde-markdown,
        [data-color-mode="dark"] .w-md-editor-preview .wmde-markdown {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}
