# Open SkillHub 部署文档

## 快速部署（推荐）

### 1. 服务器环境要求

- **操作系统**：CentOS/RHEL 7+ 或 Ubuntu 20.04+
- **Node.js**：20.x LTS
- **Python**：3.8+（如果需要知识库功能）
- **内存**：至少 2GB
- **磁盘**：至少 5GB

### 2. 安装 Node.js

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证
node -v  # v20.x.x
```

### 3. 克隆项目

```bash
cd /opt
git clone https://github.com/wangbingpeng/open-skillhub.git
cd open-skillhub
```

### 4. 安装依赖并构建

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 5. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改以下配置：
nano .env
```

**必须修改的配置：**

```env
# 数据库
DATABASE_URL="file:./dev.db"

# NextAuth（替换为你的服务器 IP 或域名）
NEXTAUTH_URL="http://你的服务器IP:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # 生产环境请使用强密钥
AUTH_TRUST_HOST=true
```

**可选配置（AI 功能）：**

```env
# DashScope API（阿里云）
DASHSCOPE_API_KEY="your-api-key"
DASHSCOPE_MODEL="qwen-plus"

# Chroma 向量数据库（知识库功能需要）
CHROMA_URL="http://localhost:8000"
```

### 6. 初始化数据库

```bash
# 生成 Prisma 客户端
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 填充种子数据（创建管理员账号）
npx prisma db seed
```

> 默认管理员账号：**admin / admin123**

### 7. 安装 Chroma（可选，知识库功能需要）

```bash
# 创建 Python 虚拟环境
python3 -m venv /opt/chroma-venv
source /opt/chroma-venv/bin/activate

# 安装 Chroma
pip install chromadb
deactivate

# 创建数据目录
mkdir -p /opt/open-skillhub/chroma-data

# 启动 Chroma（后台运行）
nohup /opt/chroma-venv/bin/chroma run \
  --host 0.0.0.0 --port 8000 \
  --path /opt/open-skillhub/chroma-data &

# 验证
curl http://localhost:8000/api/v1/heartbeat
```

### 8. 启动服务

**方式 A：直接启动（测试用）**

```bash
npm start
# 访问 http://服务器IP:3000
```

**方式 B：使用 PM2（生产环境推荐）**

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "open-skillhub" -- start

# 设置开机自启
pm2 save
pm2 startup
```

**方式 C：使用 systemd（生产环境推荐）**

```bash
# 获取 node 路径
which node  # 例如：/root/.nvm/versions/node/v20.18.1/bin/node

# 创建 service 文件
cat > /etc/systemd/system/open-skillhub.service << EOF
[Unit]
Description=Open SkillHub
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/open-skillhub
ExecStart=$(which node) node_modules/.bin/next start
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/open-skillhub/.env

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
systemctl daemon-reload
systemctl enable open-skillhub
systemctl start open-skillhub

# 查看状态
systemctl status open-skillhub
```

### 9. 开放防火墙

```bash
# CentOS/RHEL
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload

# Ubuntu
sudo ufw allow 3000/tcp
```

**重要**：还需要在云厂商控制台配置安全组，放行 3000 端口。

### 10. 访问验证

浏览器访问：`http://你的服务器IP:3000`

登录账号：`admin / admin123`

---

## 更新部署

```bash
cd /opt/open-skillhub

# 拉取最新代码
git pull

# 安装依赖（如果有新依赖）
npm install

# 重新构建
npm run build

# 更新数据库
npx prisma migrate deploy

# 重启服务
pm2 restart open-skillhub
# 或
systemctl restart open-skillhub
```

---

## 常用运维命令

### PM2 管理

```bash
pm2 list                    # 查看服务列表
pm2 logs open-skillhub      # 查看日志
pm2 restart open-skillhub   # 重启服务
pm2 stop open-skillhub      # 停止服务
pm2 monit                   # 监控资源
```

### systemd 管理

```bash
systemctl status open-skillhub              # 查看状态
journalctl -u open-skillhub -f -n 50        # 查看日志
systemctl restart open-skillhub             # 重启服务
systemctl stop open-skillhub                # 停止服务
```

### 备份数据库

```bash
# 备份
cp /opt/open-skillhub/prisma/dev.db /backup/dev.db-$(date +%Y%m%d)

# 恢复
cp /backup/dev.db-20260425 /opt/open-skillhub/prisma/dev.db
systemctl restart open-skillhub
```

---

## 常见问题

### 1. 报错 `UntrustedHost`

**解决**：在 `.env` 中添加 `AUTH_TRUST_HOST=true`

### 2. 报错 `DATABASE_URL not found`

**解决**：确保 `.env` 文件存在且包含 `DATABASE_URL="file:./dev.db"`

### 3. 服务启动成功但无法访问

**检查清单**：
- [ ] 防火墙是否开放 3000 端口
- [ ] 云厂商安全组是否放行 3000 端口
- [ ] `.env` 中 `HOSTNAME=0.0.0.0`（如果有此配置）

### 4. 端口被占用

```bash
# 查看占用 3000 端口的进程
lsof -i :3000

# 修改端口
echo "PORT=3001" >> .env
```

### 5. Prisma 报错 `P1012`

**解决**：检查 `package.json` 中 prisma 版本是否为 `6.19.3`（不要有 `^` 符号）

---

## 环境变量说明

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | 是 | 数据库连接 | `file:./dev.db` |
| `NEXTAUTH_URL` | 是 | 应用访问地址 | `http://IP:3000` |
| `NEXTAUTH_SECRET` | 是 | NextAuth 密钥 | 随机字符串 |
| `AUTH_TRUST_HOST` | 是 | 信任所有主机 | `true` |
| `DASHSCOPE_API_KEY` | 否 | AI API 密钥 | `sk-xxx` |
| `CHROMA_URL` | 否 | Chroma 地址 | `http://localhost:8000` |
| `PORT` | 否 | 服务端口 | `3000` |

---

## 项目结构

```
open-skillhub/
├── src/              # 源代码
├── prisma/           # 数据库模型
│   ├── schema.prisma
│   └── dev.db        # SQLite 数据库（自动生成）
├── public/           # 静态资源
├── uploads/          # 上传文件目录
├── .env              # 环境变量（自己创建）
├── .env.example      # 环境变量模板
└── package.json
```

---

## 获取帮助

- 项目文档：[README.md](./README.md)
- GitHub Issues：[https://github.com/wangbingpeng/open-skillhub/issues](https://github.com/wangbingpeng/open-skillhub/issues)
