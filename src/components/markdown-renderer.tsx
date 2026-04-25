"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 导入 highlight.js 样式
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 代码块复制按钮组件
function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-background/80 hover:bg-background"
      onClick={handleCopy}
      aria-label={copied ? "已复制" : "复制代码"}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        // 标题样式
        "prose-headings:scroll-mt-20 prose-headings:font-semibold",
        "prose-h1:text-3xl prose-h1:mb-6",
        "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4",
        "prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3",
        // 段落和列表
        "prose-p:leading-relaxed prose-p:my-4",
        "prose-li:my-1",
        // 链接样式
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // 代码样式
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-zinc-200 dark:prose-code:bg-zinc-700 prose-code:text-sm prose-code:font-mono prose-code:text-zinc-900 dark:prose-code:text-zinc-100",
        // 图片样式
        "prose-img:rounded-lg prose-img:shadow-md prose-img:my-6",
        // 引用块样式
        "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
        // 分割线样式
        "prose-hr:my-8",
        // 表格样式
        "prose-table:w-full prose-table:border-collapse",
        "prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted prose-th:font-semibold prose-th:text-left",
        "prose-td:border prose-td:border-border prose-td:p-3",
        "prose-tr:nth-child(even):bg-muted/50",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // 自定义代码块渲染
          pre({ children }) {
            return (
              <div className="relative group my-6">
                <pre className="!m-0 !p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] overflow-x-auto">
                  {children}
                </pre>
              </div>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");

            // 如果是代码块（有语言标识或包含换行）
            if (language || codeString.includes("\n")) {
              return (
                <>
                  {language && (
                    <div className="absolute top-2 left-4 text-xs text-muted-foreground font-mono select-none">
                      {language}
                    </div>
                  )}
                  <code className={className} {...props}>
                    {children}
                  </code>
                  <CodeCopyButton code={codeString} />
                </>
              );
            }

            // 行内代码
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // 自定义链接渲染 - 在新窗口打开
          a({ href, children, ...props }) {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          // 自定义图片渲染
          img({ src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-lg shadow-md"
                loading="lazy"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
