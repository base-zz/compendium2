#!/bin/bash
# deploy-to-vps.sh - Single-Directory Deployment

# ===== Configuration =====
CERTBOT_EMAIL="basselhajj@compendiumnav.com"  # ← MUST CHANGE
DOMAIN="compendiumnav.com"                  # ← Verify matches .env.vps

VPS_USER="root"
VPS_HOST="compendiumnav.com"
VPS_DEPLOY_DIR="/root/relay"
LOCAL_PROJECT_DIR="/Users/basselabul-hajj/compendiumnav2"

# Files to deploy (all in root)
ESSENTIAL_FILES=(
  "src/relay/vps/nginx.conf"
  "ssl/fullchain.pem" 
  "ssl/privkey.pem"  
  "src/relay/vps/index.js"          
  "src/relay/vps/VPSRelayProxy.js"  
  "src/relay/vps/manageTokens.js" 
  "src/relay/vps/tokenManager.js" 
  "src/relay/package.json"
  ".env.vps"
  "src/relay/vps/Dockerfile"
  "src/relay/vps/docker-compose.yml"
  "src/relay/vps/.dockerignore"
  "src/relay/vps/package-lock.json" 
)


# Replace the openssl block with docker ssl:
# if [ ! -d "./ssl" ]; then
#   mkdir -p ./ssl
#   docker run -it --rm \
#     -v "./ssl:/etc/letsencrypt" \
#     -p 80:80 certbot/certbot certonly \
#     --standalone --non-interactive --agree-tos \
#     --email "$CERTBOT_EMAIL" -d "$DOMAIN"   # ← Uses variables
# fi
# Replace the docker certbot block with:
mkdir -p ./ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/privkey.pem \
  -out ./ssl/fullchain.pem \
  -subj "/CN=compendiumnav.com"


# Deploy with strict permissions:
scp -rp ./ssl $VPS_USER@$VPS_HOST:/root/relay/
ssh $VPS_USER@$VPS_HOST "chmod 600 /root/relay/ssl/*.pem"

# ===== Deployment =====
echo "🚀 Deploying to $VPS_DEPLOY_DIR..."

# 1. Create target directory
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_DEPLOY_DIR"

# 2. Copy all files
for file in "${ESSENTIAL_FILES[@]}"; do
  filename=$(basename "$file")
  scp "$LOCAL_PROJECT_DIR/$file" "$VPS_USER@$VPS_HOST:$VPS_DEPLOY_DIR/$filename"
  echo "✅ Deployed: $filename"
done

# 3. Set permissions
ssh $VPS_USER@$VPS_HOST "
  chmod 750 $VPS_DEPLOY_DIR/*.js &&       # JS files executable
  chmod 600 $VPS_DEPLOY_DIR/.env.vps &&   # Config protected
  chown -R root:docker $VPS_DEPLOY_DIR    # Consistent ownership
"

echo "🎉 All files deployed to $VPS_DEPLOY_DIR"