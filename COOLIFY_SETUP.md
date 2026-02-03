# Coolify Deployment Guide

This guide explains how to deploy Manus Builder to Coolify with automatic deployments on GitHub push.

## Prerequisites

- A running Coolify instance
- GitHub repository connected to Coolify
- Access to Coolify dashboard

## Step 1: Create PostgreSQL Database

1. In Coolify, go to **Resources** > **New** > **Database** > **PostgreSQL**
2. Configure the database:
   - Name: `manus-postgres` (or your preference)
   - Version: `15` (recommended)
3. Click **Create**
4. Once created, copy the **Internal Connection String** - you'll need this for `DATABASE_URL`

## Step 2: Connect GitHub Repository

1. In Coolify, go to **Sources** > **GitHub**
2. If not connected, follow the OAuth flow to connect your GitHub account
3. Authorize Coolify to access your repository: `Ryan911199/manus-builder-open`

## Step 3: Create Docker Compose Resource

1. Go to **Resources** > **New** > **Docker Compose**
2. Select your GitHub source and repository
3. Configure:
   - **Branch**: `main`
   - **Compose File**: `docker-compose.coolify.yml`
   - **Build Pack**: Docker Compose
4. Click **Create**

## Step 4: Configure Environment Variables

In the resource settings, go to **Environment Variables** and add:

### Required Variables

| Variable       | Description                              | Example                                            |
| -------------- | ---------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string from Step 1 | `postgresql://user:pass@manus-postgres:5432/manus` |
| `JWT_SECRET`   | Random secret for authentication         | Generate with `openssl rand -base64 32`            |
| `LLM_PROVIDER` | LLM provider to use                      | `openai`, `anthropic`, `minimax`, or `ollama`      |

### LLM API Keys (at least one required)

| Variable            | Description                             |
| ------------------- | --------------------------------------- |
| `OPENAI_API_KEY`    | OpenAI API key (if using OpenAI)        |
| `ANTHROPIC_API_KEY` | Anthropic API key (if using Claude)     |
| `MINIMAX_API_KEY`   | MiniMax API key (if using MiniMax)      |
| `OLLAMA_HOST`       | Ollama host URL (if using local Ollama) |

See `.env.example.coolify` for the complete list of available variables.

## Step 5: Enable Auto-Deploy on Push

1. In your resource settings, go to **Webhooks**
2. Enable **Auto Deploy**
3. Coolify will now automatically redeploy when you push to the `main` branch

### How it works:

- Push code to GitHub `main` branch
- GitHub webhook notifies Coolify
- Coolify pulls latest code
- Docker images are rebuilt
- Services are restarted with new code

## Step 6: Configure Domain (Optional)

1. Go to **Settings** > **Domain**
2. Add your domain (e.g., `manus.yourdomain.com`)
3. Coolify will automatically provision SSL via Let's Encrypt

## Step 7: Deploy

1. Click **Deploy** to start the initial deployment
2. Monitor the build logs for any errors
3. Once complete, access your app at the configured domain or Coolify-generated URL

## Troubleshooting

### Build Fails

- Check build logs in Coolify
- Ensure all required environment variables are set
- Verify Dockerfiles are present: `Dockerfile.node` and `services/orchestrator/Dockerfile`

### Database Connection Issues

- Ensure PostgreSQL resource is running
- Verify `DATABASE_URL` uses the internal hostname (not localhost)
- Check that both services are on the same Coolify network

### Orchestrator Not Connecting

- The Node.js service connects to orchestrator via internal Docker network
- `ORCHESTRATOR_URL` is pre-configured to `http://orchestrator:8001`
- Check orchestrator health: `curl http://orchestrator:8001/health`

### LLM Not Working

- Verify `LLM_PROVIDER` matches your API key
- Check API key is valid and has sufficient credits
- For Ollama, ensure the host is accessible from Coolify network

## File Structure

```
manus-builder/
├── Dockerfile.node              # Node.js service Dockerfile
├── docker-compose.coolify.yml   # Coolify-specific compose file
├── .env.example.coolify         # Environment variables reference
└── services/
    └── orchestrator/
        └── Dockerfile           # Python orchestrator Dockerfile
```

## Architecture

```
                 Coolify
                    │
     ┌──────────────┼──────────────┐
     │              │              │
     ▼              ▼              ▼
┌─────────┐   ┌───────────┐   ┌──────────┐
│  Node   │──▶│Orchestrator│   │PostgreSQL│
│ :3000   │   │   :8001   │   │  :5432   │
└─────────┘   └───────────┘   └──────────┘
     │              │              ▲
     └──────────────┴──────────────┘
                    │
              Docker Network
```

## Updates

To update your deployment:

1. Push changes to `main` branch
2. Coolify auto-deploys (if enabled)
3. Or manually click **Redeploy** in Coolify dashboard

For major updates, consider:

- Running database migrations if schema changed
- Checking release notes for breaking changes
- Testing in a staging environment first
