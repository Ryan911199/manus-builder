# Open Manus Builder - MVP

An open-source AI code builder with multi-agent orchestration using LangGraph.

## Features

- **Multi-Agent Code Generation**: Planner → Coder → Reviewer workflow
- **BYOK LLM Support**: OpenAI, Anthropic, MiniMax, Ollama
- **Live Preview**: Sandpack integration for React, Vue, Vanilla JS
- **Multi-File Projects**: Generate complete applications with multiple files
- **Agent Status Display**: See which agent is working in real-time

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.11+
- MySQL database (optional for dev mode)
- Docker and Docker Compose (optional)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd manus-clone

# Install Node.js dependencies
pnpm install

# Install Python dependencies
cd services/orchestrator
pip install -e .
cd ../..

# Copy environment file
cp .env.example .env
# Edit .env and add your LLM API key
```

### Running the App

**Option 1: Docker Compose (Recommended)**

```bash
docker-compose up -d
```

**Option 2: Manual**

```bash
# Terminal 1: Start Python orchestrator
cd services/orchestrator
uvicorn main:app --port 8001

# Terminal 2: Start Node.js backend + frontend
pnpm dev
```

Open http://localhost:3000 in your browser.

## Architecture

```
Frontend (React 19)
├── Three-panel UI (chat, editor, preview)
├── LLM provider settings
└── Agent status display
        ↓ tRPC
Node.js Backend (Express)
├── BYOK LLM abstraction (4 providers)
├── Orchestrator client
└── Project management
        ↓ HTTP/REST
Python Microservice (FastAPI + LangGraph)
├── Planner Agent (task decomposition)
├── Coder Agent (multi-file generation)
└── Reviewer Agent (code review)
```

### Agent Workflow

1. **Planner**: Decomposes user task into 3-7 subtasks
2. **Coder**: Generates code for each subtask (parallel execution)
3. **Reviewer**: Reviews code quality, requests revisions if needed
4. **Iteration**: Up to 3 revision cycles for quality

## Configuration

### Environment Variables

See `.env.example` for all available variables.

**Required**:

- `LLM_PROVIDER`: Which provider to use (openai, anthropic, minimax, ollama)
- `LLM_API_KEY` or provider-specific key (e.g., `OPENAI_API_KEY`)

**Optional**:

- `DATABASE_URL`: MySQL connection string (not required in dev mode)
- `ORCHESTRATOR_URL`: Python service URL (default: http://localhost:8001)
- `LLM_MODEL`: Override default model for provider

### LLM Provider Setup

**OpenAI**:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
```

**Anthropic**:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
```

**MiniMax**:

```bash
LLM_PROVIDER=minimax
MINIMAX_API_KEY=xxx
MINIMAX_GROUP_ID=xxx  # Optional
```

**Ollama (Local)**:

```bash
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```

## Development

### Running Tests

```bash
# Node.js tests
pnpm test

# Python tests
cd services/orchestrator
pytest
```

### Project Structure

```
manus-clone/
├── client/               # React frontend
│   └── src/
│       ├── pages/        # Builder UI
│       └── components/   # UI components
├── server/               # Node.js backend
│   ├── _core/            # Core services
│   ├── llm/              # LLM provider abstraction
│   └── orchestrator/     # Python client
├── services/
│   └── orchestrator/     # Python FastAPI service
│       ├── agents/       # Agent implementations
│       ├── graph/        # LangGraph workflow
│       └── tests/        # Python tests
└── docker-compose.yml
```

### Adding New LLM Providers

1. Create provider class in `server/llm/providers/`
2. Extend `OpenAICompatibleProvider` or implement `LLMProvider` interface
3. Register in `server/_core/llm.ts` `initializeRegistry()`
4. Add environment variables to `.env.example`

## Deployment

### Docker Compose (Production)

```bash
# Set environment variables in .env
# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Checklist

- [ ] `LLM_PROVIDER` and API key configured
- [ ] `DATABASE_URL` set (for production)
- [ ] `JWT_SECRET` set (for production)
- [ ] `ORCHESTRATOR_URL` points to Python service
- [ ] Coolify variables set (if using Coolify deployment)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
