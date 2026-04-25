import { SkillDetail } from "@/types";

export const mockSkillDetail: SkillDetail = {
  id: "1",
  name: "Self-Improving Agent",
  slug: "self-improving-agent",
  description: "记录经验教训、错误及修正以实现持续改进。适用于命令行工具开发、自动化脚本等场景。",
  content: `# Self-Improving Agent

## 简介

这是一个自改进型 AI Agent 技能，能够自动记录开发过程中的经验教训、错误及其修正方案，从而实现持续改进。

## 功能特性

- **自动记录经验教训**：在开发过程中自动识别并记录有价值的经验
- **错误追踪和修正建议**：捕获错误模式并提供修正建议
- **持续改进机制**：基于历史记录优化后续行为
- **多场景适用**：适用于命令行工具开发、自动化脚本、Web 应用开发等

## 示例代码

### 基础用法

\`\`\`python
from agent import SelfImproving

# 初始化 Agent
agent = SelfImproving(
    model="gpt-4",
    memory_size=100
)

# 记录新的经验
agent.learn("新的经验")

# 执行改进
agent.improve()
\`\`\`

### 高级配置

\`\`\`python
from agent import SelfImproving, Config

config = Config(
    auto_save=True,
    feedback_loop=True,
    max_retries=3
)

agent = SelfImproving(config=config)
\`\`\`

## 配置说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| model | string | gpt-4 | 使用的 AI 模型 |
| memory_size | int | 100 | 记忆容量上限 |
| auto_save | bool | true | 是否自动保存 |
| feedback_loop | bool | true | 是否启用反馈循环 |

## 使用场景

1. **命令行工具开发**：自动记录 CLI 工具的使用模式和常见错误
2. **自动化脚本**：优化脚本执行流程，减少失败率
3. **Web 应用开发**：记录 API 调用模式和性能优化点

## 注意事项

- 建议定期清理过期的记忆记录
- 对于敏感信息，请使用加密存储
- 在生产环境中建议配置日志级别为 WARNING

## 更新日志

详见版本历史 Tab。`,
  installation: `# 安装

## 通过 pip 安装

\`\`\`bash
pip install self-improving-agent
\`\`\`

## 通过源码安装

\`\`\`bash
git clone https://github.com/example/self-improving-agent.git
cd self-improving-agent
pip install -e .
\`\`\`

## 环境要求

- Python >= 3.9
- OpenAI API Key
- Redis (可选，用于分布式缓存)

## 快速开始

1. 设置环境变量：
\`\`\`bash
export OPENAI_API_KEY=your_api_key
\`\`\`

2. 运行示例：
\`\`\`bash
python examples/basic_usage.py
\`\`\`

## 配置环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| OPENAI_API_KEY | 是 | OpenAI API 密钥 |
| LOG_LEVEL | 否 | 日志级别，默认 INFO |`,
  version: "1.2.0",
  categoryId: "1",
  category: { 
    id: "1", 
    name: "AI 智能", 
    slug: "ai-intelligence",
    icon: null,
    order: 1,
    createdAt: new Date("2026-01-01")
  },
  authorId: "1",
  author: { 
    id: "1", 
    name: "张三", 
    username: "zhangsan", 
    email: "zhangsan@example.com",
    avatar: null,
    role: "USER",
    department: null,
    bio: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01")
  },
  tags: [
    { id: "1", name: "AI", createdAt: new Date("2026-01-01") }, 
    { id: "2", name: "自动化", createdAt: new Date("2026-01-01") }, 
    { id: "3", name: "Python", createdAt: new Date("2026-01-01") }
  ],
  status: "PUBLISHED",
  downloads: 37700,
  views: 89000,
  _count: { 
    likes: 2800, 
    favorites: 1200, 
    comments: 156 
  },
  versions: [
    { 
      id: "v3", 
      version: "1.2.0", 
      changelog: "新增自动标签功能，优化记忆检索性能，支持多模态输入", 
      content: "",
      skillId: "1",
      createdAt: new Date("2026-03-20") 
    },
    { 
      id: "v2", 
      version: "1.1.0", 
      changelog: "支持多语言，增加批量导入功能，修复内存泄漏问题", 
      content: "",
      skillId: "1",
      createdAt: new Date("2026-02-10") 
    },
    { 
      id: "v1", 
      version: "1.0.0", 
      changelog: "初始版本发布，包含基础自改进功能", 
      content: "",
      skillId: "1",
      createdAt: new Date("2026-01-15") 
    },
  ],
  comments: [],
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-03-20"),
};

// 更多 mock 技能数据
export const mockSkillsList = [
  {
    id: "2",
    name: "API 文档生成器",
    slug: "api-doc-generator",
    description: "自动从代码注释生成 API 文档，支持 OpenAPI/Swagger 格式",
  },
  {
    id: "3",
    name: "代码审查助手",
    slug: "code-review-assistant",
    description: "AI 驱动的代码审查工具，自动检测潜在问题和改进建议",
  },
  {
    id: "4",
    name: "数据库迁移工具",
    slug: "db-migration-tool",
    description: "支持多种数据库的自动化迁移工具，带版本控制功能",
  },
];

// 分类 mock 数据
export const mockCategories = [
  { id: "1", name: "AI 智能", slug: "ai-intelligence" },
  { id: "2", name: "开发工具", slug: "dev-tools" },
  { id: "3", name: "数据处理", slug: "data-processing" },
  { id: "4", name: "测试工具", slug: "testing-tools" },
  { id: "5", name: "运维工具", slug: "ops-tools" },
];

// 标签 mock 数据
export const mockTags = [
  { id: "1", name: "AI" },
  { id: "2", name: "自动化" },
  { id: "3", name: "Python" },
  { id: "4", name: "JavaScript" },
  { id: "5", name: "TypeScript" },
  { id: "6", name: "CLI" },
  { id: "7", name: "Web" },
  { id: "8", name: "API" },
];
