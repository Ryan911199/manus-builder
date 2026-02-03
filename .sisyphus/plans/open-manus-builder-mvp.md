# Open Manus Builder - MVP Work Plan

## TL;DR

> **Quick Summary**: Transform the existing manus-builder-open codebase into an open-source AI code builder with multi-agent orchestration using LangGraph (Python microservice) and BYOK LLM support.
>
> **Deliverables**:
>
> - Working AI code builder with multi-agent code generation
> - BYOK LLM support (MiniMax, Anthropic, OpenAI, self-hosted)
> - LangGraph-powered agent orchestration (Python FastAPI service)
> - Existing Sandpack preview preserved
> - No auth required (dev mode)
>
> **Estimated Effort**: Large (2-3 weeks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 9

---

## Context

### Original Request

User wants to build an open-source Manus clone (AI code builder) using the manus-builder-open codebase as a starting point. The goal is to have multi-agent orchestration for building complex applications, with BYOK LLM support and eventual deployment to Coolify.

### Interview Summary

**Key Decisions**:

- MVP focuses on code generation, NOT execution (Beam deferred to V2)
- Coolify deployment deferred to V2
- LangGraph for agent orchestration via Python microservice
- BYOK LLM with MiniMax, Anthropic, OpenAI, self-hosted options
- No authentication during development
- Keep existing Sandpack preview
- Keep existing project management

**Scope Boundaries**:

- IN: Agent orchestration, BYOK LLM, code generation
- OUT (V2): Beam sandbox, Coolify deployment, auth, research agents

### Research Findings

- **Codebase Quality**: 7.5/10 - Solid foundation with tRPC, Drizzle, React 19
- **LangGraph**: Python SDK is mature, TypeScript is limited → Python microservice chosen
- **LLM Integration**: Currently calls forge.manus.im → needs abstraction layer
- **Auth**: Tied to Manus OAuth → make optional for dev mode

### Metis Review

**Identified Gaps** (addressed):

- LangGraph runtime decision: Python microservice chosen
- Inter-service communication: REST/HTTP between Node.js and Python
- Agent state persistence: PostgreSQL checkpointer for LangGraph

---

## Work Objectives

### Core Objective

Build a working AI code builder MVP with multi-agent orchestration that can generate multi-file applications through coordinated LangGraph agents, with support for multiple LLM providers.

### Concrete Deliverables

1. Node.js backend with Manus dependencies removed
2. BYOK LLM abstraction layer supporting 4+ providers
3. Python FastAPI microservice with LangGraph orchestration
4. Agent system: Planner, Coder (multi-file), Reviewer
5. Updated frontend with agent status UI
6. Test coverage for critical paths

### Definition of Done

- [x] App runs locally with `pnpm dev` + Python service
- [x] Can select LLM provider in settings
- [x] Chat generates multi-file code via agent orchestration
- [x] Agent status visible in UI
- [x] All existing tests pass + new tests for LLM/agents

### Must Have

- BYOK LLM provider selection
- Multi-agent code generation
- Planner → Coder → Reviewer workflow
- Multi-file output
- Sandpack preview of generated code

### Must NOT Have (Guardrails)

- No code execution in MVP (deferred to V2 with Beam)
- No Coolify deployment integration (deferred to V2)
- No authentication (dev mode only)
- No browser automation
- No research agents (V2)
- Do NOT over-engineer agent system - start simple
- Do NOT add agents that require execution (tester agent needs Beam)

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (Vitest configured)
- **User wants tests**: YES (Tests-after for new code)
- **Framework**: Vitest for Node.js, pytest for Python

### Automated Verification

Each TODO includes executable verification:

- **Backend changes**: curl commands + expected JSON responses
- **Python service**: pytest tests + curl commands
- **Frontend changes**: Dev server + manual verification (Playwright in V2)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Strip Manus dependencies (Node.js)
├── Task 2: Setup Python microservice scaffold
└── Task 3: Create LLM provider abstraction

Wave 2 (After Wave 1):
├── Task 4: Implement LLM providers (MiniMax, Anthropic, OpenAI, Ollama)
├── Task 5: Build LangGraph agent orchestration
└── Task 6: Create agent definitions (Planner, Coder, Reviewer)

Wave 3 (After Wave 2):
├── Task 7: Integrate Python service with Node.js backend
├── Task 8: Update frontend for agent status
└── Task 9: Add settings UI for LLM provider selection

Final:
└── Task 10: Testing and documentation

Critical Path: Task 1 → Task 3 → Task 5 → Task 7 → Task 9
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 3, 7   | 2                    |
| 2    | None       | 5, 6   | 1, 3                 |
| 3    | 1          | 4, 7   | 2                    |
| 4    | 3          | 7      | 5, 6                 |
| 5    | 2          | 6, 7   | 4                    |
| 6    | 5          | 7      | 4                    |
| 7    | 4, 5, 6    | 8, 9   | None                 |
| 8    | 7          | 10     | 9                    |
| 9    | 7          | 10     | 8                    |
| 10   | 8, 9       | None   | None                 |

---

## TODOs

### Task 1: Strip Manus Dependencies

**What to do**:

- Remove Manus OAuth dependency from `server/_core/sdk.ts`
- Make authentication optional in `server/_core/context.ts`
- Remove `forge.manus.im` hardcoding from `server/_core/llm.ts`
- Update environment variable handling in `server/_core/env.ts`
- Create bypass for protected procedures when no auth

**Must NOT do**:

- Delete the OAuth code entirely (keep for V2)
- Break existing database schema
- Remove project CRUD functionality

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Straightforward code removal/modification
- **Skills**: [`git-master`]
  - `git-master`: Atomic commits for each change

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3)
- **Blocks**: Tasks 3, 7
- **Blocked By**: None

**References**:

- `server/_core/sdk.ts` - OAuth service to make optional
- `server/_core/context.ts:15-25` - Auth middleware to bypass
- `server/_core/llm.ts:212-215` - Forge API URL to parameterize
- `server/_core/env.ts` - Environment variables to update
- `server/_core/trpc.ts:25-35` - Protected procedure middleware

**Acceptance Criteria**:

```bash
# Server starts without OAUTH_SERVER_URL
unset OAUTH_SERVER_URL && pnpm dev
# Assert: Server starts on port 3000, no errors

# API accessible without auth
curl http://localhost:3000/api/trpc/system.health
# Assert: Returns {"result":{"data":"ok"}}

# Projects API works without auth (dev mode)
curl -X POST http://localhost:3000/api/trpc/projects.create \
  -H "Content-Type: application/json" \
  -d '{"json":{"name":"Test","framework":"react","files":{"/App.jsx":"test"}}}'
# Assert: Returns project object with id
```

**Commit**: YES

- Message: `feat: make auth optional for dev mode`
- Files: `server/_core/sdk.ts`, `server/_core/context.ts`, `server/_core/env.ts`, `server/_core/trpc.ts`

---

### Task 2: Setup Python Microservice Scaffold

**What to do**:

- Create `services/orchestrator/` directory structure
- Setup FastAPI application with health check
- Create `pyproject.toml` with dependencies (langgraph, fastapi, uvicorn)
- Create Dockerfile for the service
- Create docker-compose.yml for local development
- Add `.env.example` for Python service

**Must NOT do**:

- Implement actual agent logic yet (Task 5-6)
- Over-engineer the structure
- Add unnecessary dependencies

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Scaffold creation with known patterns
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3)
- **Blocks**: Tasks 5, 6
- **Blocked By**: None

**References**:

- FastAPI docs: https://fastapi.tiangolo.com/
- LangGraph docs: https://langchain-ai.github.io/langgraph/
- Project root `package.json` for naming conventions

**Acceptance Criteria**:

```bash
# Python service starts
cd services/orchestrator && pip install -e . && uvicorn main:app --port 8001
# Assert: Server starts, logs "Uvicorn running on http://0.0.0.0:8001"

# Health check works
curl http://localhost:8001/health
# Assert: Returns {"status":"ok"}

# Docker build works
docker build -t orchestrator services/orchestrator/
# Assert: Build completes without errors

# Docker compose starts both services
docker-compose up -d
# Assert: Both node and python services running
```

**Directory Structure**:

```
services/orchestrator/
├── pyproject.toml
├── Dockerfile
├── main.py              # FastAPI app
├── agents/
│   ├── __init__.py
│   ├── planner.py       # (stub)
│   ├── coder.py         # (stub)
│   └── reviewer.py      # (stub)
├── graph/
│   ├── __init__.py
│   └── workflow.py      # (stub)
└── tests/
    └── test_health.py
```

**Commit**: YES

- Message: `feat: add Python orchestrator service scaffold`
- Files: `services/orchestrator/*`, `docker-compose.yml`

---

### Task 3: Create LLM Provider Abstraction

**What to do**:

- Create `server/llm/` directory with provider interface
- Define `LLMProvider` interface/type
- Create `LLMProviderRegistry` for managing providers
- Create base `OpenAICompatibleProvider` class (most providers use this)
- Update `server/_core/llm.ts` to use new abstraction
- Add provider configuration to environment handling

**Must NOT do**:

- Implement all providers yet (Task 4)
- Add streaming yet (can be added later)
- Over-engineer - keep it simple

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
  - Reason: Requires careful interface design
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Task 4, 7
- **Blocked By**: Task 1

**References**:

- `server/_core/llm.ts` - Existing LLM implementation to refactor
- `server/_core/env.ts` - Environment variable patterns
- OpenAI API: https://platform.openai.com/docs/api-reference/chat

**Acceptance Criteria**:

```bash
# TypeScript compiles
pnpm check
# Assert: No type errors

# Provider registry works
curl -X POST http://localhost:3000/api/trpc/ai.generate \
  -H "Content-Type: application/json" \
  -d '{"json":{"prompt":"Hello","framework":"react"}}'
# Assert: Returns generated code (uses default provider)
```

**Interface Design**:

```typescript
// server/llm/types.ts
export interface LLMProvider {
  name: string;
  invoke(params: InvokeParams): Promise<InvokeResult>;
  listModels?(): Promise<string[]>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// server/llm/registry.ts
export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider>;
  register(name: string, provider: LLMProvider): void;
  get(name: string): LLMProvider | undefined;
  getDefault(): LLMProvider;
}
```

**Commit**: YES

- Message: `refactor: create LLM provider abstraction layer`
- Files: `server/llm/*`, `server/_core/llm.ts`

---

### Task 4: Implement LLM Providers

**What to do**:

- Implement `OpenAIProvider` (extends OpenAICompatibleProvider)
- Implement `AnthropicProvider` (custom, different API format)
- Implement `MiniMaxProvider` (extends OpenAICompatibleProvider)
- Implement `OllamaProvider` (extends OpenAICompatibleProvider, local)
- Add provider selection endpoint
- Update settings to store user's provider preference

**Must NOT do**:

- Add providers beyond these four in MVP
- Implement streaming (keep it simple)
- Add complex error handling (basic is fine)

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
  - Reason: Multiple similar implementations with slight variations
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 5, 6)
- **Blocks**: Task 7
- **Blocked By**: Task 3

**References**:

- `server/llm/types.ts` - Interface from Task 3
- OpenAI API: https://platform.openai.com/docs/api-reference/chat
- Anthropic API: https://docs.anthropic.com/en/api/messages
- MiniMax API: Uses OpenAI-compatible format
- Ollama API: http://localhost:11434/api/chat (OpenAI-compatible)

**Acceptance Criteria**:

```bash
# OpenAI provider works
LLM_PROVIDER=openai OPENAI_API_KEY=sk-xxx pnpm dev
curl -X POST http://localhost:3000/api/trpc/ai.generate \
  -H "Content-Type: application/json" \
  -d '{"json":{"prompt":"Create hello world","framework":"react"}}'
# Assert: Returns generated React code

# Anthropic provider works
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-xxx pnpm dev
curl -X POST http://localhost:3000/api/trpc/ai.generate \
  -H "Content-Type: application/json" \
  -d '{"json":{"prompt":"Create hello world","framework":"react"}}'
# Assert: Returns generated React code

# Provider selection endpoint
curl http://localhost:3000/api/trpc/llm.providers
# Assert: Returns ["openai", "anthropic", "minimax", "ollama"]
```

**Commit**: YES

- Message: `feat: implement BYOK LLM providers (OpenAI, Anthropic, MiniMax, Ollama)`
- Files: `server/llm/providers/*`

---

### Task 5: Build LangGraph Agent Orchestration

**What to do**:

- Implement LangGraph StateGraph in `services/orchestrator/graph/workflow.py`
- Define agent state schema
- Implement Orchestrator-Worker pattern with `Send` API
- Add checkpointer for state persistence (PostgreSQL)
- Create API endpoints for starting/monitoring agent workflows
- Implement basic error handling and retries

**Must NOT do**:

- Add human-in-the-loop yet (keep initial flow automatic)
- Over-complicate the state schema
- Add more than 3 agents in MVP

**Recommended Agent Profile**:

- **Category**: `ultrabrain`
  - Reason: Complex state machine design requires careful thought
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 6)
- **Blocks**: Tasks 6, 7
- **Blocked By**: Task 2

**References**:

- LangGraph Orchestrator-Worker: https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/
- `services/orchestrator/main.py` - FastAPI app from Task 2
- `services/orchestrator/agents/` - Agent stubs from Task 2

**Acceptance Criteria**:

```bash
# Start workflow endpoint works
curl -X POST http://localhost:8001/workflow/start \
  -H "Content-Type: application/json" \
  -d '{"task":"Create a todo app with add/remove functionality","framework":"react"}'
# Assert: Returns {"workflow_id": "uuid", "status": "started"}

# Check workflow status
curl http://localhost:8001/workflow/{workflow_id}/status
# Assert: Returns {"status": "running|completed", "current_agent": "planner|coder|reviewer"}

# Get workflow result
curl http://localhost:8001/workflow/{workflow_id}/result
# Assert: Returns {"files": {...}, "explanation": "..."}

# pytest passes
cd services/orchestrator && pytest
# Assert: All tests pass
```

**LangGraph Pattern**:

```python
# services/orchestrator/graph/workflow.py
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send, Command

class AgentState(TypedDict):
    task: str
    framework: str
    plan: list[str]
    files: dict[str, str]
    review_feedback: str | None
    iteration: int

def planner(state: AgentState) -> Command:
    # Break task into subtasks
    plan = planner_llm.invoke(state["task"])
    return Command(update={"plan": plan}, goto="assign_coders")

def assign_coders(state: AgentState) -> list[Send]:
    # Fan out to coder agents for each subtask
    return [Send("coder", {"subtask": s}) for s in state["plan"]]

def coder(state: AgentState) -> dict:
    # Generate code for subtask
    code = coder_llm.invoke(state["subtask"])
    return {"files": code}

def reviewer(state: AgentState) -> Command:
    # Review and potentially request fixes
    review = reviewer_llm.invoke(state["files"])
    if review.needs_fixes and state["iteration"] < 3:
        return Command(update={"review_feedback": review.feedback, "iteration": state["iteration"] + 1}, goto="coder")
    return Command(goto=END)

graph = StateGraph(AgentState)
graph.add_node("planner", planner)
graph.add_node("assign_coders", assign_coders)
graph.add_node("coder", coder)
graph.add_node("reviewer", reviewer)
graph.add_edge(START, "planner")
# ... edges
```

**Commit**: YES

- Message: `feat: implement LangGraph orchestration workflow`
- Files: `services/orchestrator/graph/*`, `services/orchestrator/main.py`

---

### Task 6: Create Agent Definitions

**What to do**:

- Implement Planner agent with task decomposition prompt
- Implement Coder agent with multi-file generation prompt
- Implement Reviewer agent with code review prompt
- Add prompt templates for each agent
- Wire agents into LangGraph workflow

**Must NOT do**:

- Add more than these 3 agents
- Make prompts overly complex
- Add agents that need code execution

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
  - Reason: Prompt engineering requires iteration
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 5)
- **Blocks**: Task 7
- **Blocked By**: Task 5

**References**:

- `services/orchestrator/graph/workflow.py` - Workflow from Task 5
- `services/orchestrator/agents/` - Agent directory
- Existing prompt in `server/routers.ts:176-199` - Code generation prompt pattern

**Acceptance Criteria**:

```bash
# Planner decomposes task
curl -X POST http://localhost:8001/agents/planner/test \
  -d '{"task":"Build a todo app","framework":"react"}'
# Assert: Returns {"subtasks": ["Create App component", "Add todo state", "Create TodoList", "Create TodoItem", "Add styling"]}

# Coder generates code
curl -X POST http://localhost:8001/agents/coder/test \
  -d '{"subtask":"Create TodoList component that displays items","framework":"react"}'
# Assert: Returns {"files": {"/TodoList.jsx": "..."}}

# Reviewer provides feedback
curl -X POST http://localhost:8001/agents/reviewer/test \
  -d '{"files":{"/App.jsx":"...","/TodoList.jsx":"..."}}'
# Assert: Returns {"approved": true|false, "feedback": "..."}
```

**Commit**: YES

- Message: `feat: implement Planner, Coder, and Reviewer agents`
- Files: `services/orchestrator/agents/*`

---

### Task 7: Integrate Python Service with Node.js Backend

**What to do**:

- Create `server/orchestrator/` client for Python service
- Add tRPC procedures to call orchestrator API
- Handle workflow state and streaming updates
- Add error handling for service unavailability
- Update `server/routers.ts` to use orchestrator for code generation

**Must NOT do**:

- Implement WebSocket yet (polling is fine for MVP)
- Break existing direct LLM generation (keep as fallback)

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
  - Reason: Integration requires careful error handling
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (sequential)
- **Blocks**: Tasks 8, 9
- **Blocked By**: Tasks 4, 5, 6

**References**:

- `server/routers.ts` - Existing AI router to update
- `services/orchestrator/main.py` - Python API endpoints
- `server/_core/trpc.ts` - tRPC patterns

**Acceptance Criteria**:

```bash
# Orchestrator endpoint works through Node.js
curl -X POST http://localhost:3000/api/trpc/ai.orchestrate \
  -H "Content-Type: application/json" \
  -d '{"json":{"task":"Create a counter app","framework":"react"}}'
# Assert: Returns {"workflowId": "uuid"}

# Status polling works
curl http://localhost:3000/api/trpc/ai.workflowStatus?input={"json":{"workflowId":"uuid"}}
# Assert: Returns {"status": "running|completed", "files": {...}}

# Fallback to direct LLM works when orchestrator is down
# (Stop Python service first)
curl -X POST http://localhost:3000/api/trpc/ai.generate \
  -H "Content-Type: application/json" \
  -d '{"json":{"prompt":"Create hello world","framework":"react"}}'
# Assert: Still returns generated code
```

**Commit**: YES

- Message: `feat: integrate Python orchestrator with Node.js backend`
- Files: `server/orchestrator/*`, `server/routers.ts`

---

### Task 8: Update Frontend for Agent Status

**What to do**:

- Add agent status display in chat panel
- Show current agent (Planner/Coder/Reviewer) during generation
- Add progress indicator for multi-step workflow
- Update chat to show agent explanations
- Handle workflow polling in frontend

**Must NOT do**:

- Over-design the UI
- Add complex animations
- Implement real-time WebSocket (polling is fine)

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
  - Reason: UI updates with status display
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: UI polish for status display

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 9)
- **Blocks**: Task 10
- **Blocked By**: Task 7

**References**:

- `client/src/pages/Builder.tsx` - Main builder UI
- `client/src/components/AIChatBox.tsx` - Chat component
- `client/src/components/ui/` - UI components library

**Acceptance Criteria**:

```
# Agent uses playwright skill to verify:
1. Navigate to: http://localhost:3000
2. Enter prompt: "Create a todo app"
3. Click: Generate button
4. Assert: Agent status indicator appears
5. Assert: Status shows "Planner" then "Coder" then "Reviewer"
6. Assert: Files appear in editor when complete
7. Screenshot: .sisyphus/evidence/task-8-agent-status.png
```

**Commit**: YES

- Message: `feat: add agent status UI to builder`
- Files: `client/src/pages/Builder.tsx`, `client/src/components/AgentStatus.tsx`

---

### Task 9: Add Settings UI for LLM Provider Selection

**What to do**:

- Add LLM provider selection to settings dialog
- Add API key input fields per provider
- Add model selection dropdown
- Save settings to localStorage (no auth = no DB)
- Wire settings to backend on API calls

**Must NOT do**:

- Store API keys in database (security risk without auth)
- Expose API keys in responses
- Add complex validation

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
  - Reason: Form UI for settings
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Settings form UX

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 8)
- **Blocks**: Task 10
- **Blocked By**: Task 7

**References**:

- `client/src/pages/Builder.tsx:589-648` - Existing settings dialog
- `client/src/components/ui/select.tsx` - Select component
- `client/src/components/ui/input.tsx` - Input component

**Acceptance Criteria**:

```
# Agent uses playwright skill to verify:
1. Navigate to: http://localhost:3000
2. Click: Settings button
3. Assert: LLM Provider dropdown visible
4. Select: "anthropic" from dropdown
5. Assert: API key input appears
6. Fill: API key field with "test-key"
7. Click: Save
8. Assert: Settings persisted (refresh page, check settings)
9. Screenshot: .sisyphus/evidence/task-9-settings.png
```

**Commit**: YES

- Message: `feat: add LLM provider settings UI`
- Files: `client/src/pages/Builder.tsx`, `client/src/hooks/useLLMSettings.ts`

---

### Task 10: Testing and Documentation

**What to do**:

- Add tests for LLM provider abstraction
- Add tests for orchestrator client
- Add integration tests for full workflow
- Update README with setup instructions
- Add `.env.example` with all required variables
- Document architecture decisions

**Must NOT do**:

- Write excessive documentation
- Add E2E tests (V2)
- Test every edge case (focus on happy path)

**Recommended Agent Profile**:

- **Category**: `writing`
  - Reason: Documentation focus
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Final
- **Blocks**: None (final task)
- **Blocked By**: Tasks 8, 9

**References**:

- `server/projects.test.ts` - Existing test patterns
- `vitest.config.ts` - Test configuration
- `services/orchestrator/tests/` - Python test directory

**Acceptance Criteria**:

```bash
# All Node.js tests pass
pnpm test
# Assert: All tests pass, including new LLM tests

# All Python tests pass
cd services/orchestrator && pytest
# Assert: All tests pass

# README exists with setup instructions
cat README.md | grep -q "Quick Start"
# Assert: Found

# .env.example has all variables
cat .env.example | wc -l
# Assert: >= 10 lines
```

**Commit**: YES

- Message: `test: add tests and documentation for MVP`
- Files: `server/**/*.test.ts`, `services/orchestrator/tests/*`, `README.md`, `.env.example`

---

## Commit Strategy

| After Task | Message                                                    | Key Files                        |
| ---------- | ---------------------------------------------------------- | -------------------------------- |
| 1          | `feat: make auth optional for dev mode`                    | `server/_core/*`                 |
| 2          | `feat: add Python orchestrator service scaffold`           | `services/orchestrator/*`        |
| 3          | `refactor: create LLM provider abstraction layer`          | `server/llm/*`                   |
| 4          | `feat: implement BYOK LLM providers`                       | `server/llm/providers/*`         |
| 5          | `feat: implement LangGraph orchestration workflow`         | `services/orchestrator/graph/*`  |
| 6          | `feat: implement Planner, Coder, and Reviewer agents`      | `services/orchestrator/agents/*` |
| 7          | `feat: integrate Python orchestrator with Node.js backend` | `server/orchestrator/*`          |
| 8          | `feat: add agent status UI to builder`                     | `client/src/*`                   |
| 9          | `feat: add LLM provider settings UI`                       | `client/src/*`                   |
| 10         | `test: add tests and documentation for MVP`                | `*.test.ts`, `README.md`         |

---

## Success Criteria

### Verification Commands

```bash
# Full stack starts
docker-compose up -d && pnpm dev
# Expected: Both services running

# End-to-end code generation works
curl -X POST http://localhost:3000/api/trpc/ai.orchestrate \
  -d '{"json":{"task":"Create a React todo app","framework":"react"}}'
# Expected: Returns workflowId, eventually returns multi-file code

# Provider switching works
# (Set different provider in UI, generate code)
# Expected: Code generated using selected provider
```

### Final Checklist

- [x] App runs with `docker-compose up` + `pnpm dev`
- [x] Can select LLM provider in settings
- [x] Can enter API key for selected provider
- [x] Chat generates multi-file code via agents
- [x] Agent status visible during generation
- [x] Planner → Coder → Reviewer flow completes
- [x] Sandpack preview shows generated code
- [x] All tests pass
- [x] README has setup instructions
