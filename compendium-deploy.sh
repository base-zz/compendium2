#!/bin/bash
# compendium-deploy.sh - Enhanced deployment script for Compendium Navigation

set -euo pipefail
IFS=$'\n\t'

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="compendium-server"
APP_USER="$(whoami)"
APP_DIR="/home/$APP_USER/compendiumnav2"
BACKUP_DIR="/home/$APP_USER/compendium-backups"
NODE_VERSION="18"
GIT_REPO="https://github.com/base-zz/compendium2.git"
GIT_BRANCH="main"  

# Default ports - will be adjusted if in use
DEFAULT_HTTP_PORT=8080
DEFAULT_WS_PORT=3009
HTTP_PORT=$DEFAULT_HTTP_PORT
WS_PORT=$DEFAULT_WS_PORT

# Ensure running as root
check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo -e "${RED}This script must be run as root. Use sudo.${NC}"
        exit 1
    fi
}

# Check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Find available port
find_available_port() {
    local port=$1
    while command_exists nc && nc -z 127.0.0.1 $port &>/dev/null; do
        echo "Port $port is in use, trying next port..."
        ((port++))
    done
    echo $port
}

# Backup existing installation
backup_existing() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$timestamp"
    
    echo -e "${YELLOW}Creating backup of existing installation...${NC}"
    mkdir -p "$backup_path"
    
    if [ -d "$APP_DIR" ]; then
        cp -r "$APP_DIR" "$backup_path/app"
        echo -e "${GREEN}Backup created at: $backup_path${NC}"
    else
        echo -e "${YELLOW}No existing installation found to backup.${NC}"
    fi
}

# Install system dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing system dependencies...${NC}"
    
    # Update package lists
    apt-get update
    
    # Install required packages
    local deps=(
        git curl wget build-essential
        python3 python3-pip ufw netcat-openbsd
        certbot python3-certbot-nginx  # For SSL
    )
    
    # Install dependencies
    apt-get install -y "${deps[@]}"
    
    # Install Node.js
    if ! command_exists node; then
        echo -e "${YELLOW}Installing Node.js...${NC}"
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2
    if ! command_exists pm2; then
        echo -e "${YELLOW}Installing PM2...${NC}"
        npm install -g pm2
    fi
}

# Clone or update repository
setup_repository() {
    echo -e "${YELLOW}Setting up repository...${NC}"
    
    # Ensure git is installed
    if ! command_exists git; then
        echo -e "${YELLOW}Git is not installed. Attempting to install...${NC}"
        apt-get update
        if ! apt-get install -y git; then
            echo -e "${RED}Failed to install Git. Please install Git manually and try again.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Git installed successfully${NC}"
    fi
    
    if [ ! -d "$APP_DIR/.git" ]; then
        echo -e "${BLUE}Cloning repository...${NC}"
        sudo -u "$APP_USER" git clone -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR" || {
            echo -e "${RED}Failed to clone repository. Please check your network connection and repository URL.${NC}"
            exit 1
        }
    else
        echo -e "${BLUE}Updating repository...${NC}"
        cd "$APP_DIR"
        sudo -u "$APP_USER" git fetch origin || {
            echo -e "${YELLOW}Warning: Failed to fetch from origin. Continuing with local repository.${NC}"
            return 1
        }
        sudo -u "$APP_USER" git checkout "$GIT_BRANCH" || {
            echo -e "${YELLOW}Warning: Failed to checkout branch $GIT_BRANCH. Continuing with current branch.${NC}"
            return 1
        }
        sudo -u "$APP_USER" git reset --hard "origin/$GIT_BRANCH" || {
            echo -e "${YELLOW}Warning: Failed to reset to origin/$GIT_BRANCH. Continuing with current state.${NC}"
            return 1
        }
    fi
}

# Configure environment
configure_environment() {
    echo -e "${YELLOW}Configuring environment...${NC}"
    cd "$APP_DIR"
    
    # Install dependencies
    echo -e "${BLUE}Installing Node.js dependencies...${NC}"
    sudo -u "$APP_USER" npm install --production
    
    # Create/update .env.production
    local env_file="$APP_DIR/.env.production"
    local temp_file=$(mktemp)
    
    # Preserve existing settings or create new file
    if [ -f "$env_file" ]; then
        cp "$env_file" "$temp_file"
    fi
    
    # Update ports
    grep -v -E "^(PORT|DIRECT_WS_PORT)=" "$temp_file" > "$env_file" 2>/dev/null || true
    echo "PORT=$HTTP_PORT" >> "$env_file"
    echo "DIRECT_WS_PORT=$WS_PORT" >> "$env_file"
    echo "NODE_ENV=production" >> "$env_file"
    
    # Set permissions
    chown "$APP_USER:$APP_USER" "$env_file"
    chmod 600 "$env_file"
    
    rm -f "$temp_file"
}

# Setup systemd service
setup_service() {
    echo -e "${YELLOW}Setting up systemd service...${NC}"
    
    cat > /etc/systemd/system/compendium.service << EOL
[Unit]
Description=Compendium Navigation Server
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$(which node) src/server/dev-server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOL

    systemctl daemon-reload
    systemctl enable compendium.service
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    if [ "$HTTP_PORT" -eq 80 ] && [ -z "${SKIP_SSL:-}" ]; then
        read -p "Do you want to set up SSL with Let's Encrypt? (y/n): " ssl_choice
        if [[ "$ssl_choice" =~ ^[Yy] ]]; then
            echo -e "${YELLOW}Setting up SSL...${NC}"
            
            # Stop any service using port 80
            systemctl stop nginx 2>/dev/null || true
            
            # Get domain
            read -p "Enter your domain name (e.g., example.com): " domain_name
            
            if [ -n "$domain_name" ]; then
                # Temporarily stop our service
                systemctl stop compendium.service 2>/dev/null || true
                
                # Get certificate
                if certbot certonly --standalone -d "$domain_name" --non-interactive --agree-tos --email admin@$domain_name; then
                    # Configure Nginx as reverse proxy
                    apt-get install -y nginx
                    
                    cat > /etc/nginx/sites-available/compendium << EOL
server {
    listen 80;
    server_name $domain_name;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $domain_name;
    
    ssl_certificate /etc/letsencrypt/live/$domain_name/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain_name/privkey.pem;
    
    location / {
        proxy_pass http://localhost:$HTTP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL
                    ln -sf /etc/nginx/sites-available/compendium /etc/nginx/sites-enabled/
                    systemctl restart nginx
                    
                    # Update .env.production with HTTPS settings
                    echo "HTTPS_ENABLED=true" >> "$APP_DIR/.env.production"
                    echo "DOMAIN=$domain_name" >> "$APP_DIR/.env.production"
                    
                    # Restart service
                    systemctl restart compendium.service
                    
                    echo -e "${GREEN}SSL successfully configured for https://$domain_name${NC}"
                else
                    echo -e "${RED}Failed to obtain SSL certificate. Continuing without SSL.${NC}"
                    systemctl start compendium.service 2>/dev/null || true
                fi
            fi
        fi
    fi
}

# Health check
health_check() {
    echo -e "\n${YELLOW}Running health checks...${NC}"
    local success=true
    
    # Check if service is running
    if systemctl is-active --quiet compendium.service; then
        echo -e "${GREEN}✓ Service is running${NC}"
    else
        echo -e "${RED}✗ Service is not running${NC}"
        success=false
    fi
    
    # Check if ports are accessible
    for port in $HTTP_PORT $WS_PORT; do
        if nc -z localhost $port; then
            echo -e "${GREEN}✓ Port $port is accessible${NC}"
        else
            echo -e "${RED}✗ Port $port is not accessible${NC}"
            success=false
        fi
    done
    
    if $success; then
        echo -e "\n${GREEN}✓ All health checks passed!${NC}"
    else
        echo -e "\n${YELLOW}⚠ Some health checks failed. Check the logs with: journalctl -u compendium -n 50${NC}"
    fi
}

# Main installation function
install() {
    echo -e "${GREEN}=== Starting Compendium Navigation Server Installation ===${NC}"
    
    check_root
    backup_existing
    install_dependencies
    
    # Find available ports
    echo -e "${YELLOW}Checking for available ports...${NC}"
    HTTP_PORT=$(find_available_port $DEFAULT_HTTP_PORT)
    WS_PORT=$(find_available_port $DEFAULT_WS_PORT)
    
    # Ensure ports are different
    while [ $HTTP_PORT -eq $WS_PORT ]; do
        WS_PORT=$(find_available_port $((WS_PORT + 1)))
    done
    
    echo -e "${GREEN}Using ports:${NC}"
    echo -e "  - HTTP: $HTTP_PORT (default: $DEFAULT_HTTP_PORT)"
    echo -e "  - WebSocket: $WS_PORT (default: $DEFAULT_WS_PORT)"
    
    setup_repository
    configure_environment
    setup_service
    
    # Start the service
    echo -e "${YELLOW}Starting service...${NC}"
    systemctl start compendium.service
    
    # Configure firewall
    echo -e "${YELLOW}Configuring firewall...${NC}"
    ufw --force enable
    ufw allow 22/tcp  # SSH
    ufw allow 80/tcp  # HTTP (for Let's Encrypt)
    ufw allow 443/tcp # HTTPS
    ufw allow "$HTTP_PORT/tcp"
    ufw allow "$WS_PORT/tcp"
    
    # Setup SSL if port 80 is available
    if [ "$HTTP_PORT" -ne 80 ]; then
        setup_ssl
    fi
    
    # Run health checks
    health_check
    
    # Print completion message
    local ip_address=$(hostname -I | awk '{print $1}')
    
    echo -e "\n${GREEN}=== Installation Complete! ===${NC}"
    echo -e "Your Compendium Navigation Server is now running."
    echo -e ""
    echo -e "${YELLOW}Access Information:${NC}"
    echo -e "  - Local URL:    http://localhost:$HTTP_PORT"
    echo -e "  - Network URL:  http://$ip_address:$HTTP_PORT"
    echo -e "  - WebSocket:    ws://$ip_address:$WS_PORT"
    echo -e ""
    echo -e "${YELLOW}Management Commands:${NC}"
    echo -e "  Start:    systemctl start compendium"
    echo -e "  Stop:     systemctl stop compendium"
    echo -e "  Restart:  systemctl restart compendium"
    echo -e "  Status:   systemctl status compendium"
    echo -e "  Logs:     journalctl -u compendium -f"
    echo -e ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Open your browser to http://$ip_address:$HTTP_PORT"
    echo -e "2. Check the logs if you encounter any issues"
    echo -e "3. Consider setting up a domain name and SSL certificate"
}

# Update function
update() {
    echo -e "${GREEN}=== Updating Compendium Navigation Server ===${NC}"
    
    check_root
    backup_existing
    
    # Stop service before update
    systemctl stop compendium.service 2>/dev/null || true
    
    # Update repository
    cd "$APP_DIR"
    sudo -u "$APP_USER" git fetch origin
    sudo -u "$APP_USER" git reset --hard "origin/$GIT_BRANCH"
    
    # Update dependencies
    sudo -u "$APP_USER" npm install --production
    
    # Restart service
    systemctl start compendium.service
    
    echo -e "\n${GREEN}✓ Update complete!${NC}"
    echo -e "The server has been updated to the latest version."
}

# Uninstall function
uninstall() {
    echo -e "${RED}=== Uninstalling Compendium Navigation Server ===${NC}"
    read -p "Are you sure you want to uninstall? This will remove all application files. (y/n): " confirm
    
    if [[ "$confirm" =~ ^[Yy] ]]; then
        check_root
        
        # Stop and disable service
        systemctl stop compendium.service 2>/dev/null || true
        systemctl disable compendium.service 2>/dev/null || true
        rm -f /etc/systemd/system/compendium.service
        systemctl daemon-reload
        
        # Remove application files
        if [ -d "$APP_DIR" ]; then
            local backup_path="$BACKUP_DIR/uninstall_$(date +%Y%m%d_%H%M%S)"
            echo -e "${YELLOW}Creating backup at $backup_path before uninstall...${NC}"
            mkdir -p "$backup_path"
            mv "$APP_DIR" "$backup_path/app"
        fi
        
        # Clean up
        rm -rf "$APP_DIR"
        
        echo -e "\n${GREEN}✓ Uninstall complete!${NC}"
        echo -e "A backup of your data has been saved to $backup_path"
    else
        echo -e "${YELLOW}Uninstall cancelled.${NC}"
    fi
}

# Show help
show_help() {
    echo -e "${GREEN}Compendium Navigation Server Management Script${NC}"
    echo -e "Usage: $0 [command]"
    echo -e ""
    echo -e "Commands:"
    echo -e "  install     Install a new instance (default)"
    echo -e "  update      Update to the latest version"
    echo -e "  uninstall   Remove the application and all data"
    echo -e "  help        Show this help message"
    echo -e ""
    echo -e "Environment variables:"
    echo -e "  GIT_BRANCH  Set the git branch to use (default: main)"
    echo -e "  SKIP_SSL    Skip SSL setup (set to 1 to skip)"
}

# Main script execution
case "${1:-}" in
    update)
        update
        ;;
    uninstall)
        uninstall
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        install
        ;;
esac

exit 0