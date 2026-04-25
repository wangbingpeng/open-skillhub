import { PrismaClient, Role, PostType, PostStatus, AuditAction } from "@prisma/client"
import { hash } from "bcryptjs"
import slugify from "slugify"

const prisma = new PrismaClient()

async function main() {
  // 创建管理员用户
  const adminPassword = await hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      email: "admin@example.com",
      name: "管理员",
      role: Role.ADMIN,
      department: "技术部",
    },
  })

  // 创建示例用户
  const userPassword = await hash("user123", 12)
  const user1 = await prisma.user.upsert({
    where: { username: "zhangsan" },
    update: {},
    create: {
      username: "zhangsan",
      password: userPassword,
      email: "zhangsan@example.com",
      name: "张三",
      role: Role.USER,
      department: "前端组",
    },
  })

  // 创建分类（参考 SkillHub 的 8 大分类）
  const categories = [
    { name: "AI 智能", slug: "ai-intelligence", icon: "brain", order: 1 },
    { name: "开发工具", slug: "developer-tools", icon: "wrench", order: 2 },
    { name: "效率提升", slug: "productivity", icon: "zap", order: 3 },
    { name: "数据分析", slug: "data-analysis", icon: "bar-chart", order: 4 },
    { name: "内容创作", slug: "content-creation", icon: "pen-tool", order: 5 },
    { name: "安全合规", slug: "security", icon: "shield", order: 6 },
    { name: "通讯协作", slug: "collaboration", icon: "users", order: 7 },
    { name: "其他", slug: "others", icon: "box", order: 8 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }

  // 创建标签
  const tags = ["Python", "JavaScript", "TypeScript", "React", "Node.js", "AI", "自动化", "CLI", "API", "数据处理"]
  for (const tagName of tags) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    })
  }

  // 创建论坛示例帖子 - 讨论帖
  const discussionPosts = [
    {
      title: "如何优化 React 组件的性能？",
      content: `最近在开发过程中遇到了一些性能瓶颈，想和大家讨论一下 React 性能优化的最佳实践。

目前我了解的方法有：
1. 使用 React.memo 避免不必要的重渲染
2. 使用 useMemo 和 useCallback 缓存计算结果和函数
3. 代码分割和懒加载
4. 虚拟列表处理大数据量

大家还有什么其他的优化技巧吗？欢迎分享！`,
      type: PostType.DISCUSSION,
      tags: "React,性能优化,前端",
    },
    {
      title: "AI 辅助编程工具对比评测",
      content: `最近尝试了几款 AI 编程助手，包括 GitHub Copilot、Cursor 和 Claude Code。

个人使用感受：
- Copilot: 代码补全能力强，但有时候过于激进
- Cursor: 编辑器集成好，AI 对话体验流畅
- Claude Code: 理解复杂需求能力强，代码质量高

大家平时都在用哪些 AI 工具？有什么使用心得？`,
      type: PostType.DISCUSSION,
      tags: "AI,工具,开发效率",
    },
  ]

  for (const postData of discussionPosts) {
    const slug = slugify(postData.title, { lower: true, strict: true }) + "-" + Date.now().toString(36)
    const existingPost = await prisma.forumPost.findFirst({
      where: { title: postData.title },
    })
    
    if (!existingPost) {
      const post = await prisma.forumPost.create({
        data: {
          ...postData,
          slug,
          authorId: admin.id,
        },
      })

      // 为每个讨论帖添加回复
      if (postData.title.includes("React")) {
        await prisma.forumReply.create({
          data: {
            content: `补充一个技巧：使用 useId hook 可以避免 SSR 时的 hydration 不匹配问题。

另外，建议配合 React DevTools Profiler 来分析具体的性能瓶颈，对症下药比盲目优化更有效。`,
            authorId: user1.id,
            postId: post.id,
          },
        })
        await prisma.forumReply.create({
          data: {
            content: `还可以考虑使用 Zustand 或 Jotai 替代 Context，减少 Provider 嵌套带来的重渲染问题。`,
            authorId: admin.id,
            postId: post.id,
          },
        })
      } else {
        await prisma.forumReply.create({
          data: {
            content: `我也在用 Cursor，感觉它的 Cmd+K 功能特别好用，可以快速重构代码。

不过有时候 AI 生成的代码还是需要人工 review，不能完全依赖。`,
            authorId: user1.id,
            postId: post.id,
          },
        })
        await prisma.forumReply.create({
          data: {
            content: `同意，AI 是辅助工具，最终还是要理解代码逻辑。建议把 AI 当作一个会说话的文档和代码生成器来用。`,
            authorId: admin.id,
            postId: post.id,
          },
        })
      }
    }
  }

  // 创建需求征集帖
  const requestPosts = [
    {
      title: "征集：数据可视化技能的最佳实践",
      content: `我们团队正在做一个数据分析平台，需要处理大量图表展示。

需求：
1. 支持实时数据更新
2. 能处理 10w+ 数据点的渲染
3. 支持多种图表类型（折线、柱状、饼图、热力图等）
4. 响应式设计，适配移动端

有没有同学有相关经验？可以分享一个技能文档吗？`,
      type: PostType.REQUEST,
      tags: "数据可视化,需求征集,图表",
    },
  ]

  for (const postData of requestPosts) {
    const slug = slugify(postData.title, { lower: true, strict: true }) + "-" + Date.now().toString(36)
    const existingPost = await prisma.forumPost.findFirst({
      where: { title: postData.title },
    })
    
    if (!existingPost) {
      const post = await prisma.forumPost.create({
        data: {
          ...postData,
          slug,
          authorId: user1.id,
        },
      })

      // 添加回复
      await prisma.forumReply.create({
        data: {
          content: `推荐试试 ECharts 或 D3.js，两者都能满足你的需求。

ECharts 上手快，文档齐全；D3.js 更灵活，但学习曲线较陡。

如果需要处理超大数据量，可以考虑：
1. 数据采样/聚合
2. Canvas 渲染代替 SVG
3. 虚拟滚动只渲染可视区域`,
          authorId: admin.id,
          postId: post.id,
        },
      })
      await prisma.forumReply.create({
        data: {
          content: `我最近刚好整理了一个关于 Apache ECharts 的技能文档，等完善后就发布出来！`,
          authorId: user1.id,
          postId: post.id,
        },
      })
    }
  }

  console.log("Seed data created successfully!")
  console.log(`Admin user: admin / admin123`)
  console.log(`Test user: zhangsan / user123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
