
## Task 1: Auth Bypass Decisions

### Date: 2026-02-01

### Decision 1: DEV_USER vs Completely Bypassing Auth
**Chosen**: DEV_USER mock object
**Rationale**: The routers expect `ctx.user` to exist and access properties like `ctx.user.id`. Rather than modifying every router to handle null user, creating a mock user object is cleaner and maintains type safety.

### Decision 2: Default LLM API URL
**Chosen**: `api.openai.com` instead of keeping `forge.manus.im`
**Rationale**: OpenAI API is the standard that other providers emulate. Users can override via `BUILT_IN_FORGE_API_URL` environment variable.

### Decision 3: Keep OAuth Code vs Delete
**Chosen**: Keep OAuth code, make it optional via environment check
**Rationale**: Plan mentions OAuth may be needed for V2. Commenting out or deleting would make reintegration harder.
