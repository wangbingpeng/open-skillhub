# Open SkillHub

AI 技能管理与知识库平台 - 开源版本

[English Documentation](./README.md)

## 功能特性

- **技能发布与管理**：发布、分享和管理 AI 技能
- **知识库 RAG 语义检索**：基于 Chroma 向量数据库的智能检索
- **论坛讨论**：社区交流与问题解答
- **AI 辅助生成**：AI 辅助生成技能文档和标签建议
- **用户认证**：基于 NextAuth 的完整认证系统

## 技术栈

- **前端**：Next.js 16 + TypeScript + React 19
- **样式**：Tailwind CSS 4 + shadcn/ui
- **数据库**：SQLite + Prisma ORM
- **向量数据库**：Chroma（本地 Python 部署）
- **认证**：NextAuth 5 (Auth.js)
- **AI 集成**：支持 DashScope / OpenAI

## 快速开始

### 环境要求

- Node.js 20+
- Python 3.8+（Chroma 需要）
- npm 或 pnpm

### 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和 AI 服务

# 3. 初始化数据库
npx prisma migrate dev
npx prisma db seed

# 4. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 默认管理员账号

- 用户名：`admin`
- 密码：`admin123`

## 项目结构

```
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # React 组件
│   ├── lib/          # 工具函数和配置
│   └── types/        # TypeScript 类型定义
├── prisma/
│   ├── schema.prisma # 数据库模型
│   └── seed.ts       # 种子数据
├── public/           # 静态资源
└── uploads/          # 上传文件目录
```

## 部署

### 服务器要求

- x86_64 Linux (CentOS/RHEL/Ubuntu)
- Node.js 20+
- Python 3.8+（用于 Chroma）
- OpenSSL 1.1.x 或 3.0.x

### 部署步骤

详细部署文档见 [DEPLOY.md](./DEPLOY.md)

简要步骤：

```bash
# 1. 构建项目
npm run build

# 2. 打包（带 node_modules）
tar -czvf skillspace-deploy.tar.gz \
  --exclude='prisma/dev.db' \
  --exclude='.env' \
  node_modules .next public prisma package.json

# 3. 上传到服务器并解压
tar -xzvf skillspace-deploy.tar.gz

# 4. 重建原生模块（跨平台部署必须）
npm rebuild

# 5. 配置环境变量并初始化数据库
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# 6. 使用 systemd 或 PM2 管理服务
```

## 环境变量配置

复制 `.env.example` 为 `.env` 并修改配置：

```env
# 数据库
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST=true

# AI 服务（DashScope 或 OpenAI）
DASHSCOPE_API_KEY="your-api-key"
DASHSCOPE_MODEL="qwen-plus"

# Chroma 向量数据库
CHROMA_URL="http://localhost:8000"
```

## 贡献指南

欢迎提交贡献！请直接提交 Pull Request。

## 开源协议

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件
