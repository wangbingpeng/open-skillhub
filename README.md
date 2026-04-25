# Open SkillHub

AI Skill Management & Knowledge Base Platform - Open Source Edition

[中文文档](./README.zh-CN.md)

## Features

- **Skill Publishing & Management**: Publish, share, and manage AI skills
- **Knowledge Base RAG Semantic Search**: Intelligent retrieval powered by Chroma vector database
- **Community Forum**: Discussions and Q&A
- **AI-Assisted Generation**: AI-powered skill document and tag suggestions
- **User Authentication**: Complete authentication system based on NextAuth

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + React 19
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: SQLite + Prisma ORM
- **Vector Database**: Chroma (Local Python deployment)
- **Authentication**: NextAuth 5 (Auth.js)
- **AI Integration**: Supports DashScope / OpenAI

## Quick Start

### Requirements

- Node.js 20+
- Python 3.8+ (Required for Chroma)
- npm or pnpm

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env file to configure database and AI services

# 3. Initialize database
npx prisma migrate dev
npx prisma db seed

# 4. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Default Admin Account

- Username: `admin`
- Password: `admin123`

## Project Structure

```
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # React components
│   ├── lib/          # Utility functions and configurations
│   └── types/        # TypeScript type definitions
├── prisma/
│   ├── schema.prisma # Database models
│   └── seed.ts       # Seed data
├── public/           # Static assets
└── uploads/          # Upload directory
```

## Deployment

### Server Requirements

- x86_64 Linux (CentOS/RHEL/Ubuntu)
- Node.js 20+
- Python 3.8+ (For Chroma)
- OpenSSL 1.1.x or 3.0.x

### Deployment Steps

For detailed deployment guide, see [DEPLOY.md](./DEPLOY.md)

Quick steps:

```bash
# 1. Build project
npm run build

# 2. Package (with node_modules)
tar -czvf skillspace-deploy.tar.gz \
  --exclude='prisma/dev.db' \
  --exclude='.env' \
  node_modules .next public prisma package.json

# 3. Upload to server and extract
tar -xzvf skillspace-deploy.tar.gz

# 4. Rebuild native modules (Required for cross-platform deployment)
npm rebuild

# 5. Configure environment and initialize database
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# 6. Manage service with systemd or PM2
```

## Environment Variables

Copy `.env.example` to `.env` and modify configurations:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST=true

# AI Services (DashScope or OpenAI)
DASHSCOPE_API_KEY="your-api-key"
DASHSCOPE_MODEL="qwen-plus"

# Chroma Vector Database
CHROMA_URL="http://localhost:8000"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details
