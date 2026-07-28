# 🚀 TATT Deployment Guide for Developers

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Docker Hub Access](#-docker-hub-access)
3. [Building Images](#-building-images)
4. [Deploying to Staging](#-deploying-to-staging)
5. [Deploying to Production](#-deploying-to-production)
6. [Rollback Procedures](#-rollback-procedures)
7. [Troubleshooting](#-troubleshooting)
8. [Quick Reference](#-quick-reference)
9. [Important Notes](#-important-notes)

---

## 📌 Overview
This document outlines the complete deployment workflow for the TATT platform. We use **separate Docker images** for **staging** and **production** to ensure isolation and safe testing.

### Architecture
- **Staging Environment**: `staff.theafricanthinktank.com`
- **Production Environment**: `community.theafricanthinktank.com`
- **Docker Hub**: Images are pushed to `tatt/tatt-*`
- **Server**: EC2 instance at `34.230.78.110`

---

## 🔑 Docker Hub Access
You need access to the TATT Docker Hub organization:

| Image | Purpose |
|-------|---------|
| `tatt/tatt-api:staging` | Staging API |
| `tatt/tatt-frontend:staging` | Staging Frontend |
| `tatt/tatt-api:production` | Production API |
| `tatt/tatt-frontend:production` | Production Frontend |

### Login to Docker Hub
```bash
docker login
# Use your Docker Hub credentials (you need push access)
```

---

## 🏗 Building Images

### 1. Build and Push Staging Images

#### Staging API
```bash
# Build API
docker build --platform linux/amd64 --no-cache -t tatt/tatt-api:staging -f server/Dockerfile ./server

# Push to Docker Hub
docker push tatt/tatt-api:staging
```

#### Staging Frontend
```bash
# Build Frontend with staging environment variables
docker build --platform linux/amd64 --no-cache \
  --build-arg NEXT_PUBLIC_API_URL="https://staff.theafricanthinktank.org/api" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." \
  -t tatt/tatt-frontend:staging \
  -f frontend/Dockerfile \
  ./frontend

# Push to Docker Hub
docker push tatt/tatt-frontend:staging
```

---

### 2. Build and Push Production Images

#### Production API
```bash
# Build API
docker build --platform linux/amd64 --no-cache -t tatt/tatt-api:production -f server/Dockerfile ./server

# Push to Docker Hub
docker push tatt/tatt-api:production
```

#### Production Frontend
```bash
# Build Frontend with production environment variables
docker build --platform linux/amd64 --no-cache \
  --build-arg NEXT_PUBLIC_API_URL="https://community.theafricanthinktank.com/api" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." \
  -t tatt/tatt-frontend:production \
  -f frontend/Dockerfile \
  ./frontend

# Push to Docker Hub
docker push tatt/tatt-frontend:production
```

---

## 🚀 Deploying to Staging

### 1. SSH into EC2
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@34.230.78.110
```

### 2. Pull Latest Images
```bash
cd ~/TATTDEPLOY
docker pull tatt/tatt-api:staging
docker pull tatt/tatt-frontend:staging
```

### 3. Deploy Staging
```bash
docker-compose -f docker-compose.ec2.yml --env-file .env up -d --force-recreate
```

### 4. Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.ec2.yml ps

# Check logs
docker-compose -f docker-compose.ec2.yml logs -f
```

### 5. Test Staging
```bash
curl -I https://staff.theafricanthinktank.com
curl https://staff.theafricanthinktank.org/api/billing/plans
```

---

## 🚀 Deploying to Production

### 1. SSH into EC2
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@34.230.78.110
```

### 2. Pull Production Images
```bash
cd ~/TATTDEPLOY
docker pull tatt/tatt-api:production
docker pull tatt/tatt-frontend:production
```

### 3. Deploy Production
```bash
docker-compose -f docker-compose.ksd.yml --env-file .env.production up -d --force-recreate
```

### 4. Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.ksd.yml ps

# Check logs
docker-compose -f docker-compose.ksd.yml logs -f
```

### 5. Test Production
```bash
curl -I https://community.theafricanthinktank.com
curl https://community.theafricanthinktank.com/api/billing/plans
```

---

## 🔄 Rollback Procedures

### Rollback Staging
```bash
# Pull previous version (replace with specific tag)
docker pull tatt/tatt-api:staging-prev
docker pull tatt/tatt-frontend:staging-prev

# Update compose file to use previous tag, then redeploy
docker-compose -f docker-compose.ec2.yml --env-file .env up -d --force-recreate
```

### Rollback Production
```bash
# Pull previous version (replace with specific tag)
docker pull tatt/tatt-api:production-prev
docker pull tatt/tatt-frontend:production-prev

# Update compose file to use previous tag, then redeploy
docker-compose -f docker-compose.ksd.yml --env-file .env.production up -d --force-recreate
```

---

## 🧠 Troubleshooting

### Check Container Logs
```bash
# Staging API
docker logs tatt-api-ec2 --tail 50

# Production API
docker logs tatt-api-production --tail 50

# Staging Frontend
docker logs tatt-frontend-ec2 --tail 50

# Production Frontend
docker logs tatt-frontend-production --tail 50
```

### Check Database
```bash
# Staging
docker exec -it tatt-postgres-ec2 psql -U postgres -d tatt_db

# Production
docker exec -it tatt-postgres-production psql -U postgres -d tatt_db_production
```

### Check Nginx Configuration
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Environment Variables
```bash
# Staging API
docker exec tatt-api-ec2 env | grep -E "STRIPE_SECRET_KEY|NODE_ENV|DB_NAME"

# Production API
docker exec tatt-api-production env | grep -E "STRIPE_SECRET_KEY|NODE_ENV|DB_NAME"

# Staging Frontend
docker exec tatt-frontend-ec2 env | grep -E "NEXT_PUBLIC_API_URL|NEXT_PUBLIC_STRIPE"

# Production Frontend
docker exec tatt-frontend-production env | grep -E "NEXT_PUBLIC_API_URL|NEXT_PUBLIC_STRIPE"
```

---

## 📋 Quick Reference

### Staging Commands
| Action | Command |
|--------|---------|
| Build API | `docker build --no-cache -t tatt/tatt-api:staging -f server/Dockerfile ./server` |
| Build Frontend | `docker build --no-cache --build-arg NEXT_PUBLIC_API_URL="https://staff.theafricanthinktank.org/api" --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." -t tatt/tatt-frontend:staging -f frontend/Dockerfile ./frontend` |
| Push Images | `docker push tatt/tatt-api:staging && docker push tatt/tatt-frontend:staging` |
| Deploy | `docker-compose -f docker-compose.ec2.yml --env-file .env up -d --force-recreate` |
| Check Logs | `docker-compose -f docker-compose.ec2.yml logs -f` |

### Production Commands
| Action | Command |
|--------|---------|
| Build API | `docker build --no-cache -t tatt/tatt-api:production -f server/Dockerfile ./server` |
| Build Frontend | `docker build --no-cache --build-arg NEXT_PUBLIC_API_URL="https://community.theafricanthinktank.com/api" --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." -t tatt/tatt-frontend:production -f frontend/Dockerfile ./frontend` |
| Push Images | `docker push tatt/tatt-api:production && docker push tatt/tatt-frontend:production` |
| Deploy | `docker-compose -f docker-compose.ksd.yml --env-file .env.production up -d --force-recreate` |
| Check Logs | `docker-compose -f docker-compose.ksd.yml logs -f` |

---

## 📞 Important Notes
1. **Always test in staging first** before deploying to production
2. **Use separate tags** for staging and production images
3. **Keep `.env.production` secure** – never commit it to Git
4. **Monitor logs** after deployment to catch issues early
5. **Database migrations** should be run manually before deploying API changes
