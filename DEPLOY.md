# Open SkillHub Deployment Guide

## Quick Deployment (Recommended)

### 1. Server Requirements

- **OS**: CentOS/RHEL 7+ or Ubuntu 20.04+
- **Node.js**: 20.x LTS
- **Python**: 3.8+ (required for knowledge base feature)
- **Memory**: At least 2GB
- **Disk**: At least 5GB

### 2. Install Node.js

```bash
# Install using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Verify
node -v  # v20.x.x
```

### 3. Clone the Project

```bash
cd /opt
git clone https://github.com/wangbingpeng/open-skillhub.git
cd open-skillhub
```

### 4. Install Dependencies and Build

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 5. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
```

**Required configurations:**

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth (replace with your server IP or domain)
NEXTAUTH_URL="http://YOUR_SERVER_IP:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Use a strong secret in production
AUTH_TRUST_HOST=true
```

**Optional configurations (AI features):**

```env
# DashScope API (Alibaba Cloud)
DASHSCOPE_API_KEY="your-api-key"
DASHSCOPE_MODEL="qwen-plus"

# Chroma Vector Database (required for knowledge base)
CHROMA_URL="http://localhost:8000"
```

### 6. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database (creates admin account)
npx prisma db seed
```

> Default admin account: **admin / admin123**

### 7. Install Chroma (Optional, for Knowledge Base)

```bash
# Create Python virtual environment
python3 -m venv /opt/chroma-venv
source /opt/chroma-venv/bin/activate

# Install Chroma
pip install chromadb
deactivate

# Create data directory
mkdir -p /opt/open-skillhub/chroma-data

# Start Chroma (background)
nohup /opt/chroma-venv/bin/chroma run \
  --host 0.0.0.0 --port 8000 \
  --path /opt/open-skillhub/chroma-data &

# Verify
curl http://localhost:8000/api/v1/heartbeat
```

### 8. Start the Service

**Option A: Direct Start (for testing)**

```bash
npm start
# Visit http://YOUR_SERVER_IP:3000
```

**Option B: Using PM2 (recommended for production)**

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start npm --name "open-skillhub" -- start

# Enable auto-start on boot
pm2 save
pm2 startup
```

**Option C: Using systemd (recommended for production)**

```bash
# Get node path
which node  # e.g., /root/.nvm/versions/node/v20.18.1/bin/node

# Create service file
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

# Start service
systemctl daemon-reload
systemctl enable open-skillhub
systemctl start open-skillhub

# Check status
systemctl status open-skillhub
```

### 9. Open Firewall

```bash
# CentOS/RHEL
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload

# Ubuntu
sudo ufw allow 3000/tcp
```

**Important**: Also configure security groups in your cloud provider console to allow port 3000.

### 10. Verify Access

Visit in browser: `http://YOUR_SERVER_IP:3000`

Login: `admin / admin123`

---

## Update Deployment

```bash
cd /opt/open-skillhub

# Pull latest code
git pull

# Install dependencies (if any new ones)
npm install

# Rebuild
npm run build

# Update database
npx prisma migrate deploy

# Restart service
pm2 restart open-skillhub
# or
systemctl restart open-skillhub
```

---

## Common Operations

### PM2 Management

```bash
pm2 list                    # List services
pm2 logs open-skillhub      # View logs
pm2 restart open-skillhub   # Restart service
pm2 stop open-skillhub      # Stop service
pm2 monit                   # Monitor resources
```

### systemd Management

```bash
systemctl status open-skillhub              # Check status
journalctl -u open-skillhub -f -n 50        # View logs
systemctl restart open-skillhub             # Restart service
systemctl stop open-skillhub                # Stop service
```

### Backup Database

```bash
# Backup
cp /opt/open-skillhub/prisma/dev.db /backup/dev.db-$(date +%Y%m%d)

# Restore
cp /backup/dev.db-20260425 /opt/open-skillhub/prisma/dev.db
systemctl restart open-skillhub
```

---

## Troubleshooting

### 1. Error: `UntrustedHost`

**Solution**: Add `AUTH_TRUST_HOST=true` to `.env`

### 2. Error: `DATABASE_URL not found`

**Solution**: Ensure `.env` file exists with `DATABASE_URL="file:./dev.db"`

### 3. Service starts but cannot access

**Checklist**:
- [ ] Firewall allows port 3000
- [ ] Cloud security group allows port 3000
- [ ] `.env` has `HOSTNAME=0.0.0.0` (if configured)

### 4. Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Change port
echo "PORT=3001" >> .env
```

### 5. Prisma Error `P1012`

**Solution**: Check prisma version in `package.json` is `6.19.3` (without `^` prefix)

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Database connection | `file:./dev.db` |
| `NEXTAUTH_URL` | Yes | Application URL | `http://IP:3000` |
| `NEXTAUTH_SECRET` | Yes | NextAuth secret | Random string |
| `AUTH_TRUST_HOST` | Yes | Trust all hosts | `true` |
| `DASHSCOPE_API_KEY` | No | AI API key | `sk-xxx` |
| `CHROMA_URL` | No | Chroma address | `http://localhost:8000` |
| `PORT` | No | Service port | `3000` |

---

## Project Structure

```
open-skillhub/
├── src/              # Source code
├── prisma/           # Database models
│   ├── schema.prisma
│   └── dev.db        # SQLite database (auto-generated)
├── public/           # Static assets
├── uploads/          # Upload directory
├── .env              # Environment variables (create manually)
├── .env.example      # Environment template
└── package.json
```

---

## Get Help

- Documentation: [README.md](./README.md)
- GitHub Issues: [https://github.com/wangbingpeng/open-skillhub/issues](https://github.com/wangbingpeng/open-skillhub/issues)
