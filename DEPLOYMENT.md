# Deploying Achtung die Kurve to Digital Ocean

This guide will walk you through deploying your Achtung die Kurve game to Digital Ocean App Platform.

## Prerequisites

1. **Digital Ocean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **GitHub Repository**: Your code must be in a GitHub repository
3. **Git**: Ensure your latest changes are committed and pushed to GitHub

## Deployment Options

### Option 1: Digital Ocean App Platform (Recommended)

This is the easiest and most cost-effective way to deploy your game.

#### Step 1: Push Your Code to GitHub

Make sure all the deployment files we created are committed and pushed:

```bash
git add .
git commit -m "Add Digital Ocean deployment configuration"
git push origin main
```

#### Step 2: Create App on Digital Ocean

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **"Apps"** in the left sidebar
3. Click **"Create App"**
4. Choose **"GitHub"** as your source
5. Authorize Digital Ocean to access your GitHub account
6. Select your repository: `achtung-die-kurve`
7. Choose branch: `main`
8. **Important**: Check **"Autodeploy"** to automatically deploy when you push changes

#### Step 3: Configure the App

Digital Ocean should automatically detect the `.do/app.yaml` file. If not:

1. Click **"Edit Plan"**
2. You should see two services:
   - **websocket-server** (Node.js service)
   - **client** (Static site)

Verify the configuration matches:

**WebSocket Server:**
- **Name**: `websocket-server`
- **Type**: Web Service
- **Dockerfile Path**: `server/Dockerfile`
- **HTTP Port**: `3001`
- **Routes**: `/socket.io`
- **Instance Size**: Basic (512 MB RAM)

**Client:**
- **Name**: `client`
- **Type**: Static Site
- **Dockerfile Path**: `Dockerfile`
- **HTTP Port**: `80`
- **Routes**: `/` (catch-all)
- **Instance Size**: Basic (512 MB RAM)

#### Step 4: Environment Variables

The environment variables should be automatically configured from the `.do/app.yaml` file:

**Client Environment Variables:**
- `VITE_WEBSOCKET_URL`: `${websocket-server.PUBLIC_URL}`

**Server Environment Variables:**
- `NODE_ENV`: `production`
- `PORT`: `3001`
- `CORS_ORIGIN`: `*`

#### Step 5: Deploy

1. Review your configuration
2. Click **"Create Resources"**
3. Wait for the deployment to complete (usually 5-10 minutes)

The deployment process will:
1. Build the WebSocket server using the server Dockerfile
2. Build the client app using the main Dockerfile
3. Deploy both services
4. Configure routing and environment variables

#### Step 6: Access Your Game

Once deployed, you'll get URLs for both services:
- **Client URL**: Your main game URL (e.g., `https://your-app-name.ondigitalocean.app`)
- **WebSocket Server URL**: Used internally for multiplayer (e.g., `https://websocket-server.your-app-name.ondigitalocean.app`)

Visit the client URL to play your game!

### Option 2: Digital Ocean Droplet (Advanced)

If you prefer more control, you can deploy to a Droplet (VPS):

#### Step 1: Create a Droplet

1. Go to **"Droplets"** in Digital Ocean
2. Click **"Create Droplet"**
3. Choose **Ubuntu 22.04 LTS**
4. Select **Regular Intel** with **2 GB RAM, 1 vCPU**
5. Add your SSH key
6. Create the droplet

#### Step 2: Setup the Server

SSH into your droplet:

```bash
ssh root@your-droplet-ip
```

Install Docker and Docker Compose:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Node.js and npm (for local builds)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install nodejs -y
```

#### Step 3: Clone and Deploy

```bash
# Clone your repository
git clone https://github.com/yourusername/achtung-die-kurve.git
cd achtung-die-kurve

# Build the client
npm install
npm run build

# Setup environment variables
cp .env.example .env
cp server/.env.example server/.env

# Edit environment variables for production
nano .env
# Set: VITE_WEBSOCKET_URL=https://your-droplet-ip:3001

nano server/.env
# Set: NODE_ENV=production
# Set: CORS_ORIGIN=https://your-droplet-ip

# Deploy with Docker Compose
docker compose up -d
```

#### Step 4: Setup Nginx (Optional)

For production, set up Nginx as a reverse proxy:

```bash
# Install Nginx
apt install nginx -y

# Create Nginx configuration
cat > /etc/nginx/sites-available/achtung << EOF
server {
    listen 80;
    server_name your-domain.com;
    
    # Serve client files
    location / {
        root /root/achtung-die-kurve/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy WebSocket connections
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/achtung /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Cost Estimates

### App Platform (Recommended)
- **Basic Plan**: ~$12/month total
  - Client (Static Site): ~$3/month
  - WebSocket Server: ~$5/month
  - Bandwidth: ~$1-2/month

### Droplet
- **Basic Droplet**: $18/month (2 GB RAM, 1 vCPU, 50 GB disk)
- **+ Load Balancer** (optional): $12/month
- **+ Domain** (optional): ~$12/year

## Monitoring and Maintenance

### App Platform
- Built-in monitoring and logging
- Automatic scaling
- Zero-downtime deployments
- Automatic SSL certificates

### Droplet
- Set up monitoring with:
  ```bash
  # Install monitoring agent
  curl -sSL https://agent.digitalocean.com/install.sh | sh
  ```
- Regular updates required
- Manual SSL certificate management
- Manual scaling

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Verify Dockerfile syntax
   - Check build logs in Digital Ocean dashboard

2. **WebSocket Connection Failures**
   - Verify `VITE_WEBSOCKET_URL` environment variable
   - Check CORS configuration in server
   - Ensure both services are running

3. **Static Files Not Loading**
   - Check build output directory (`dist/`)
   - Verify Nginx configuration
   - Check file permissions

### Logs and Debugging

**App Platform:**
- View logs in Digital Ocean dashboard
- Runtime logs available for each service
- Build logs for deployment troubleshooting

**Droplet:**
```bash
# Check service status
docker ps

# View logs
docker logs achtung-die-kurve-achtung-server-1

# Debug connectivity
curl http://localhost:3001/socket.io/socket.io.js
```

## Security Considerations

1. **CORS Configuration**: Currently set to `*` for development. For production, set specific origins:
   ```javascript
   CORS_ORIGIN=https://your-domain.com
   ```

2. **Environment Variables**: Never commit real environment variables to Git

3. **HTTPS**: App Platform provides automatic HTTPS. For Droplets, use Let's Encrypt:
   ```bash
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d your-domain.com
   ```

## Scaling

### App Platform
- Automatic scaling based on traffic
- Can manually adjust instance count and size
- Built-in load balancing

### Droplet
- Vertical scaling: Resize droplet
- Horizontal scaling: Multiple droplets + load balancer
- Database scaling: Consider managed databases for game state

## Next Steps

1. Deploy using App Platform (recommended)
2. Test multiplayer functionality
3. Set up custom domain (optional)
4. Monitor performance and costs
5. Implement analytics (optional)
6. Add SSL certificate verification
7. Set up automated backups (for Droplet deployments)

Your Achtung die Kurve game should now be live and accessible to players worldwide!
