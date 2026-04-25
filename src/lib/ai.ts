/**
 * AI 工具库 - 封装阿里云 DashScope API 调用
 * 兼容 OpenAI 格式，使用 fetch 直接调用 REST API
 */

// DashScope 配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";
const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

// OpenAI 配置
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

/**
 * 检查 DashScope AI 是否已配置
 */
export function isDashScopeConfigured(): boolean {
  return !!DASHSCOPE_API_KEY && DASHSCOPE_API_KEY.length > 0;
}

/**
 * 检查 OpenAI AI 是否已配置
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.length > 0;
}

/**
 * 检查是否有任何 AI 服务已配置
 */
export function isAIConfigured(): boolean {
  return isDashScopeConfigured() || isOpenAIConfigured();
}

/**
 * 获取当前配置的 AI 提供商
 * @returns 'dashscope' | 'openai' | null
 */
export function getAIProvider(): "dashscope" | "openai" | null {
  if (isDashScopeConfigured()) return "dashscope";
  if (isOpenAIConfigured()) return "openai";
  return null;
}

/**
 * 获取 OpenAI 配置信息
 */
export function getOpenAIConfig() {
  return {
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    baseUrl: OPENAI_BASE_URL,
  };
}

/**
 * DashScope 消息类型
 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * DashScope 流式响应 chunk
 */
interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * 调用 DashScope API 生成技能文档（流式）
 * @param name 技能名称
 * @param description 技能描述
 */
export async function* generateSkillDocument(
  name: string,
  description: string
): AsyncGenerator<string> {
  if (!isAIConfigured()) {
    throw new Error("AI 服务未配置，请先配置 DASHSCOPE_API_KEY");
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `你是一个专业的技术文档撰写助手。请根据用户提供的技能名称和描述，生成一份完整的技能文档 Markdown 骨架。

文档分为两大部分，使用特殊标记 <!-- USAGE_START --> 进行分隔。

**第一部分：技能内容**（在标记之前）
包含以下章节：
1. ## 简介 - 简要介绍这个技能是什么、能做什么
2. ## 功能特性 - 列出主要功能点，使用 bullet points
3. ## 快速开始 - 最简单的入门步骤
4. ## 配置参数 - 如果有配置项，列出参数说明表格
5. ## 示例代码 - 提供实用的代码示例
6. ## 常见问题 - 列出 3-5 个常见问题及解答

**第二部分：使用说明**（在标记之后）
在文档最后输出一行 <!-- USAGE_START -->，然后紧接着输出使用说明内容，包含：
1. ## 安装 - 安装步骤和依赖说明
2. ## 配置 - 必要的环境配置和初始化步骤
3. ## 基本用法 - 最常用的使用方式和调用方法
4. ## 高级用法 - 进阶功能和技巧
5. ## 注意事项 - 使用中需要注意的要点

要求：
- 使用标准 Markdown 格式
- 内容专业、实用、易懂
- 示例代码要完整可运行
- 不要包含任何解释性文字，直接输出 Markdown 内容
- 必须包含 <!-- USAGE_START --> 标记来分隔两部分内容`,
    },
    {
      role: "user",
      content: `请为以下技能生成文档：

技能名称：${name}
技能描述：${description}

请生成完整的 Markdown 格式文档：`,
    },
  ];

  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DASHSCOPE_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

        if (trimmedLine.startsWith("data: ")) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const chunk: StreamChunk = JSON.parse(jsonStr);
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 忽略解析错误，继续处理下一行
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 调用 DashScope API 推荐标签
 * @param name 技能名称
 * @param description 技能描述
 * @param content 技能内容（可选）
 * @returns 标签数组
 */
export async function suggestTags(
  name: string,
  description: string,
  content?: string
): Promise<string[]> {
  if (!isAIConfigured()) {
    throw new Error("AI 服务未配置，请先配置 DASHSCOPE_API_KEY");
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `你是一个标签推荐助手。请根据用户提供的技能信息，推荐 5-10 个最相关的标签。

要求：
- 标签应该简洁、通用、易于理解
- 使用中文或英文技术术语
- 标签应该覆盖技能的主要技术栈、用途、场景
- 只返回标签列表，不要有任何解释
- 返回格式必须是 JSON 数组，例如：["标签1", "标签2", "标签3"]`,
    },
    {
      role: "user",
      content: `请为以下技能推荐标签：

技能名称：${name}
技能描述：${description}
${content ? `技能内容摘要：${content.slice(0, 500)}...` : ""}

请直接返回 JSON 格式的标签数组：`,
    },
  ];

  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DASHSCOPE_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${error}`);
  }

  const data = await response.json();
  const content_text = data.choices?.[0]?.message?.content || "";

  // 尝试解析 JSON
  try {
    // 先尝试直接解析
    const tags = JSON.parse(content_text);
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch {
    // 如果直接解析失败，尝试提取 JSON 数组
    const match = content_text.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const tags = JSON.parse(match[0]);
        if (Array.isArray(tags)) {
          return tags.map((tag) => String(tag).trim()).filter(Boolean);
        }
      } catch {
        // 解析失败，继续下一步
      }
    }
  }

  // 如果 JSON 解析失败，尝试按行分割
  const lines = content_text
    .split(/\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line && !line.startsWith("[") && !line.startsWith("]"))
    .map((line: string) => line.replace(/^["\']|["\'],?$/g, "").trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.slice(0, 10);
  }

  throw new Error("无法解析标签推荐结果");
}

/**
 * RAG 推理：基于检索到的上下文片段，流式生成综合回答
 * @param query 用户查询
 * @param contexts 检索到的上下文片段数组（每项含 documentName / content / score）
 */
export async function* generateRAGAnswer(
  query: string,
  contexts: Array<{ documentName: string; content: string; score: number }>
): AsyncGenerator<string> {
  if (!isAIConfigured()) {
    throw new Error("AI 服务未配置，请先配置 DASHSCOPE_API_KEY");
  }

  // 构建上下文
  const contextText = contexts
    .map((c, i) => `[文档${i + 1}: ${c.documentName}]\n${c.content}`)
    .join("\n\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `你是一个知识库问答助手。请根据用户的问题和提供的参考文档内容，给出准确、全面的回答。

要求：
- 回答必须基于参考文档内容，不要编造信息
- 如果参考文档中没有相关信息，请明确说明
- 综合多个文档的信息时，要逻辑连贯
- 引用信息时，注明来源文档名称
- 使用中文回答
- 回答要简洁明了，重点突出`,
    },
    {
      role: "user",
      content: `参考文档：\n${contextText}\n\n---\n\n用户问题：${query}\n\n请基于以上参考文档内容回答问题：`,
    },
  ];

  // 优先使用 DashScope
  const apiKey = isDashScopeConfigured() ? DASHSCOPE_API_KEY : OPENAI_API_KEY;
  const model = isDashScopeConfigured() ? DASHSCOPE_MODEL : OPENAI_MODEL;
  const baseUrl = isDashScopeConfigured() ? DASHSCOPE_BASE_URL : OPENAI_BASE_URL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

        if (trimmedLine.startsWith("data: ")) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const chunk: StreamChunk = JSON.parse(jsonStr);
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * OCR：从扫描版 PDF 提取文字
 * 使用 DashScope 文件上传 API + qwen-long 模型
 *
 * 流程：
 * 1. 上传 PDF 到 DashScope 文件 API
 * 2. 用 qwen-long 模型提取文档中的文字
 * 3. 删除远程文件
 *
 * @param buffer PDF 文件 Buffer
 * @param filename 文件名
 * @returns 提取的文字内容
 */
export async function extractTextFromScannedPdf(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (!isDashScopeConfigured()) {
    throw new Error("OCR 需要 DashScope API Key，请先配置 DASHSCOPE_API_KEY");
  }

  // 1. 上传 PDF 文件到 DashScope
  console.log(`[OCR] 上传扫描版 PDF 到 DashScope: ${filename} (${buffer.length} bytes)`);

  const fileBlob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  const formData = new FormData();
  formData.append("file", fileBlob, filename);
  formData.append("purpose", "file-extract");

  const uploadResp = await fetch(`${DASHSCOPE_BASE_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body: formData,
  });

  if (!uploadResp.ok) {
    const errText = await uploadResp.text();
    throw new Error(`DashScope 文件上传失败: ${errText}`);
  }

  const uploadData = await uploadResp.json();
  const fileId = uploadData.id;
  if (!fileId) {
    throw new Error(`DashScope 文件上传返回无效: ${JSON.stringify(uploadData)}`);
  }

  console.log(`[OCR] 文件上传成功, fileId: ${fileId}`);

  // 2. 用 qwen-long 提取文字
  try {
    const extractResp = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-long",
        messages: [
          {
            role: "user",
            content: [
              { type: "file", file: fileId },
              { type: "text", text: "请完整提取这个文档中的所有文字内容，保持原文格式，不要遗漏任何文字。如果文档有多个页面，请按页面顺序提取所有内容。" },
            ],
          },
        ],
      }),
    });

    if (!extractResp.ok) {
      const errText = await extractResp.text();
      throw new Error(`DashScope OCR 提取失败: ${errText}`);
    }

    const extractData = await extractResp.json();
    const text = extractData.choices?.[0]?.message?.content || "";

    console.log(`[OCR] 文字提取成功, 内容长度: ${text.length}`);
    return text;
  } finally {
    // 3. 清理：删除远程文件
    try {
      await fetch(`${DASHSCOPE_BASE_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
      });
      console.log(`[OCR] 远程文件已删除: ${fileId}`);
    } catch {
      // 删除失败不影响结果
    }
  }
}