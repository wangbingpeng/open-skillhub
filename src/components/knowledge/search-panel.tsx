"use client";

import { useState, useRef } from "react";
import { Loader2, FileText, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  content: string;
  documentName: string;
  score: number;
  documentId: string;
  chunkIndex: number;
}

/** 按文档分组后的结果 */
interface GroupedResult {
  documentId: string;
  documentName: string;
  bestScore: number;
  chunks: SearchResult[];
}

interface SearchPanelProps {
  knowledgeBaseId: string;
}

export function SearchPanel({ knowledgeBaseId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiSources, setAiSources] = useState<SearchResult[] | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  /** 将搜索结果按文档分组，每组取最高相似度 */
  const groupByDocument = (items: SearchResult[]): GroupedResult[] => {
    const map = new Map<string, GroupedResult>();
    for (const item of items) {
      const existing = map.get(item.documentId);
      if (existing) {
        existing.chunks.push(item);
        if (item.score > existing.bestScore) {
          existing.bestScore = item.score;
        }
      } else {
        map.set(item.documentId, {
          documentId: item.documentId,
          documentName: item.documentName,
          bestScore: item.score,
          chunks: [item],
        });
      }
    }
    // 按最高相似度降序排列
    return [...map.values()].sort((a, b) => b.bestScore - a.bestScore);
  };

  const toggleExpand = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleAsk = async () => {
    if (!query.trim()) return;

    // 清除上一次结果
    setAiAnswer("");
    setAiSources(null);
    setShowSources(false);
    setAiStreaming(true);
    setSearching(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(
        `/api/knowledge/${knowledgeBaseId}/search?mode=ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), topK: 8 }),
          signal: abort.signal,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "搜索失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "sources") {
              setAiSources(data.results || []);
            } else if (data.type === "answer") {
              setAiAnswer((prev) => prev + data.content);
            } else if (data.type === "error") {
              setAiAnswer((prev) => prev + `\n\n> ❌ ${data.error}`);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setAiAnswer("");
      setAiSources(null);
    } finally {
      setAiStreaming(false);
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="输入问题，AI 将基于知识库内容回答..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searching || !query.trim()}>
          {aiStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          问答
        </Button>
      </form>

      {/* AI 问答结果 */}
      {aiAnswer && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI 综合回答</span>
            {aiStreaming && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {aiAnswer}
          </div>
          {/* 引用来源 */}
          {aiSources && aiSources.length > 0 && !aiStreaming && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 h-7 px-2"
                onClick={() => setShowSources(!showSources)}
              >
                {showSources ? (
                  <><ChevronUp className="h-3 w-3" />收起引用来源</>
                ) : (
                  <><ChevronDown className="h-3 w-3" />查看引用来源（{groupByDocument(aiSources).length} 个文档，{aiSources.length} 个片段）</>
                )}
              </Button>
              {showSources && (
                <div className="mt-2 space-y-2">
                  {groupByDocument(aiSources).map((group) => {
                    const isExpanded = expandedDocs.has(group.documentId);
                    const topChunk = group.chunks[0];
                    const moreCount = group.chunks.length - 1;
                    return (
                      <div key={group.documentId} className="rounded-lg border p-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{group.documentName}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeof group.bestScore === 'number' && !isNaN(group.bestScore) ? (group.bestScore * 100).toFixed(1) + '%' : '-'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {topChunk.content.length > 200
                            ? topChunk.content.slice(0, 200) + "..."
                            : topChunk.content}
                        </p>
                        {moreCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground gap-1 h-6 px-1"
                            onClick={() => toggleExpand(group.documentId)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-3 w-3" />收起</>
                            ) : (
                              <><ChevronDown className="h-3 w-3" />还有 {moreCount} 个片段</>
                            )}
                          </Button>
                        )}
                        {isExpanded && group.chunks.slice(1).map((chunk, idx) => (
                          <div key={idx} className="border-t pt-1 mt-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                片段 {chunk.chunkIndex + 1}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {typeof chunk.score === 'number' && !isNaN(chunk.score) ? (chunk.score * 100).toFixed(1) + '%' : '-'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {chunk.content.length > 200
                                ? chunk.content.slice(0, 200) + "..."
                                : chunk.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 搜索中且尚未有回答 */}
      {searching && !aiAnswer && (
        <div className="flex h-32 items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">正在检索并生成回答...</span>
        </div>
      )}

      {/* 无结果 */}
      {!searching && aiSources !== null && aiSources.length === 0 && !aiAnswer && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/50">
          <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            未找到相关内容，请尝试其他关键词
          </p>
        </div>
      )}
    </div>
  );
}
