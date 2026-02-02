# MVP Improvements for Open Manus Builder

## TL;DR

> **Quick Summary**: Fix critical bugs (LangGraph workflow, MiniMax API), restructure UI to be preview-centric with sliding editor, add LLM test button, fix Sandpack preview issues, and create Playwright E2E test for proof-of-concept validation.
>
> **Deliverables**:
>
> - Fixed LangGraph workflow (no more "Expected dict, got []" error)
> - Correct MiniMax API integration (MiniMax-M2.1 model, Anthropic-compatible endpoint)
> - New UI layout: Preview as main panel, Editor/FileTree slide from right
> - "Test API Key" button for LLM providers
> - Fixed Sandpack preview (no timeout, no "Preview mode" popup)
> - Playwright E2E test validating full flow
>
> **Estimated Effort**: Medium (2-3 days)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (LangGraph) → Task 2 (MiniMax) → Task 3 (Test Button) → Task 6 (Playwright)

---

## Context

### Original Request

Fix multiple MVP issues: restructure UI with preview as main panel and sliding editor, fix chat functionality error "Expected dict, got []", fix MiniMax model dropdown (should show MiniMax-M2.1 not abab6.5s-chat), fix Sandpack timeout and "Preview mode" popup, add API key test button, create Playwright E2E test covering landing → chat → API key → test → prompt → preview.

### Interview Summary

**Key Discussions**:

- **UI Layout**: Editor and file tree slide in TOGETHER from the RIGHT side via a toggle button
- **Chat Panel**: Stays on left side (unchanged)
- **API Key Test**: Makes REAL API call to verify key works
- **Playwright Test**: Hardcode API key for now (sk-cp-o-E9Y6JQgiyTGQlYNsaDkv...)
- **Sandpack Fix**: Fix bundler config, no need for self-hosted bundler

**Research Findings**:

- LangGraph bug at `workflow.py:214-218` - `assign_coders_node` used in `add_conditional_edges` but returns `list[Send]` not routing string
- MiniMax official docs show Anthropic-compatible API at `https://api.minimax.io/anthropic/v1`
- Model names should be `MiniMax-M2.1` and `MiniMax-M2`
- Sandpack needs explicit `bundlerURL` configuration
- No existing Playwright infrastructure

### Metis Review

**Identified Gaps** (addressed):

- Chat panel behavior when editor opens: Will stay visible on left
- MiniMax endpoint format: Using Anthropic-compatible `/v1/messages`
- Animation specs: Use CSS transition with 300ms ease-in-out
- Test button rate limiting: Not needed for MVP (can add later)

**Recommended Sequence**:

1. LangGraph bug fix (backend stability)
2. MiniMax API fix (enables testing)
3. Test Button (validates LLM)
4. Sandpack fix (preview works)
5. UI Layout (visual polish)
6. Playwright test (E2E validation)

---

## Work Objectives

### Core Objective

Fix critical MVP blockers and create a proof-of-concept E2E test that validates the core user flow: landing → builder → configure API → send prompt → see preview.

### Concrete Deliverables

- `services/orchestrator/graph/workflow.py` - Fixed LangGraph workflow
- `server/llm/providers/minimax.ts` - Updated API URL and default model
- `client/src/hooks/useLLMSettings.ts` - Correct MiniMax model names
- `server/routers.ts` - New `llm.testKey` endpoint
- `client/src/pages/Builder.tsx` - UI restructure + test button UI
- `tests/e2e/builder.spec.ts` - New Playwright E2E test
- `playwright.config.ts` - Playwright configuration

### Definition of Done

- [x] `cd services/orchestrator && pytest tests/test_workflow.py -v` passes (exit code 0)
- [x] `curl -X POST http://localhost:8001/workflow/start -H "Content-Type: application/json" -d '{"task":"hello","framework":"react"}'` returns `{"workflow_id": "...", "status": "started"}`
- [x] MiniMax dropdown shows "MiniMax-M2.1" and "MiniMax-M2" (not abab6.5s-chat)
- [x] "Test API Key" button exists and shows success/failure toast
- [x] Preview panel is center/main panel when app loads
- [x] Editor panel slides from right when toggled
- [x] Sandpack preview loads without TIME_OUT error
- [x] No "Preview mode" popup at bottom
- [x] `pnpm exec playwright test tests/e2e/builder.spec.ts` passes (exit code 0)

### Must Have

- LangGraph workflow completes without error
- MiniMax API key can be tested via UI
- Preview is the main visual focus
- At least one working E2E test

### Must NOT Have (Guardrails)

- NO changes to Chat panel position/size
- NO new LLM providers added
- NO agent refactoring beyond the bug fix
- NO complex retry/caching logic for test button
- NO more than ONE E2E test file
- NO self-hosted Sandpack bundler
- NO database schema changes

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (Vitest for Node, pytest for Python)
- **User wants tests**: YES (Playwright E2E + existing tests must pass)
- **Framework**: Playwright for E2E, Vitest for unit tests, pytest for Python

### Automated Verification Approach

Each TODO includes executable verification procedures:

**By Deliverable Type:**

| Type                | Verification Tool | Automated Procedure                 |
| ------------------- | ----------------- | ----------------------------------- |
| **Python workflow** | pytest via Bash   | `pytest tests/test_workflow.py -v`  |
| **API endpoints**   | curl via Bash     | HTTP request with JSON validation   |
| **Frontend/UI**     | Playwright        | Navigate, click, screenshot, assert |
| **TypeScript/Node** | Vitest            | `pnpm test`                         |

**Evidence Requirements**:

- Command exit codes (0 = success)
- Screenshots saved to `.sisyphus/evidence/`
- JSON responses validated against expected shapes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Fix LangGraph workflow bug [no dependencies]
└── Task 4: Fix Sandpack preview issues [no dependencies]

Wave 2 (After Wave 1):
├── Task 2: Fix MiniMax API integration [depends: 1]
├── Task 3: Add LLM Test API Key button [depends: 1]
└── Task 5: Restructure UI layout [depends: 4]

Wave 3 (After Wave 2):
└── Task 6: Create Playwright E2E test [depends: 2, 3, 5]

Critical Path: Task 1 → Task 2 → Task 6
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 2, 3   | 4                    |
| 2    | 1          | 6      | 3, 5                 |
| 3    | 1          | 6      | 2, 5                 |
| 4    | None       | 5      | 1                    |
| 5    | 4          | 6      | 2, 3                 |
| 6    | 2, 3, 5    | None   | None (final)         |

### Agent Dispatch Summary

| Wave | Tasks   | Recommended Agents                                                               |
| ---- | ------- | -------------------------------------------------------------------------------- |
| 1    | 1, 4    | delegate_task(category="quick", run_in_background=true) - both are focused fixes |
| 2    | 2, 3, 5 | dispatch parallel after Wave 1 completes                                         |
| 3    | 6       | delegate_task(category="deep", load_skills=["playwright"]) - needs thoroughness  |

---

## TODOs

---

- [x] 1. Fix LangGraph Workflow Bug

  **What to do**:
  - Remove the `add_node("assign_coders", assign_coders_node)` line (line 204)
  - The `assign_coders_node` should ONLY be used in `add_conditional_edges`, not as a standalone node
  - The LangGraph Send API fan-out pattern requires the function to be used ONLY in conditional edges
  - Run pytest to verify fix works

  **Must NOT do**:
  - Do NOT refactor agent logic (planner, coder, reviewer)
  - Do NOT change other parts of the workflow graph
  - Do NOT modify the agent implementations themselves

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single focused fix in one file, clear error message, known root cause
  - **Skills**: [`git-master`]
    - `git-master`: Need atomic commit for this critical fix
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not UI work
    - `frontend-ui-ux`: Not frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `services/orchestrator/graph/workflow.py:200-227` - The workflow builder section containing the bug
  - `services/orchestrator/tests/test_integration.py:1-10` - Comment explains the known bug

  **API/Type References**:
  - `services/orchestrator/graph/workflow.py:41-54` - AgentState TypedDict definition
  - `services/orchestrator/graph/workflow.py:85-105` - assign_coders_node implementation returning list[Send]

  **Test References**:
  - `services/orchestrator/tests/test_workflow.py` - Unit tests for workflow nodes
  - `services/orchestrator/tests/test_integration.py` - Integration tests

  **External References**:
  - LangGraph Send API docs: https://langchain-ai.github.io/langgraph/concepts/low_level/#send
  - The Send API should NOT have the function added as a node, only used in conditional_edges

  **WHY Each Reference Matters**:
  - `workflow.py:200-227`: This is WHERE the bug is - lines 204 and 214-218
  - `test_integration.py:1-10`: Documents this is a KNOWN bug, confirms our diagnosis
  - LangGraph docs: Shows correct pattern - fan-out functions return Send objects and are used directly in conditional_edges

  **Acceptance Criteria**:

  **Automated Verification**:

  ```bash
  # Agent runs from services/orchestrator directory:
  cd /home/ubuntu/manus-clone/services/orchestrator && pytest tests/test_workflow.py -v
  # Assert: Exit code 0
  # Assert: Output contains "passed" and no "FAILED"
  ```

  ```bash
  # Agent runs integration test:
  cd /home/ubuntu/manus-clone/services/orchestrator && pytest tests/test_integration.py -v
  # Assert: Exit code 0
  ```

  ```bash
  # Agent starts orchestrator and tests endpoint (assumes orchestrator running):
  curl -s -X POST http://localhost:8001/workflow/start \
    -H "Content-Type: application/json" \
    -d '{"task": "Create hello world app", "framework": "react"}' \
    | grep -q "workflow_id"
  # Assert: Exit code 0 (grep found workflow_id)
  ```

  **Evidence to Capture:**
  - [ ] pytest output showing all tests pass
  - [ ] curl response showing workflow starts successfully

  **Commit**: YES
  - Message: `fix(orchestrator): remove assign_coders as node to fix LangGraph Send API usage`
  - Files: `services/orchestrator/graph/workflow.py`
  - Pre-commit: `cd services/orchestrator && pytest tests/test_workflow.py -v`

---

- [x] 2. Fix MiniMax API Integration

  **What to do**:
  - Update `useLLMSettings.ts` line 20: Change `["abab6.5s-chat", "abab5.5-chat"]` to `["MiniMax-M2.1", "MiniMax-M2"]`
  - Update `minimax.ts` line 34: Change base URL from `https://api.minimax.chat` to `https://api.minimax.io`
  - Update `minimax.ts` line 39: Change default model from `abab6.5s-chat` to `MiniMax-M2.1`
  - Update `minimax.ts` line 53: Change endpoint from `/v1/text/chatcompletion_v2` to `/anthropic/v1/messages`
  - The MiniMax API now uses Anthropic-compatible format

  **Must NOT do**:
  - Do NOT add new providers
  - Do NOT change provider selection logic
  - Do NOT modify other providers (OpenAI, Anthropic, Ollama)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacements across 2 files, clear values from docs
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for API changes
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not visual changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `server/llm/providers/minimax.ts:1-75` - Full MiniMax provider implementation
  - `server/llm/providers/base.ts:1-100` - OpenAICompatibleProvider base class

  **API/Type References**:
  - `client/src/hooks/useLLMSettings.ts:13-22` - DEFAULT_MODELS constant with provider models

  **External References**:
  - MiniMax OpenCode docs: https://platform.minimax.io/docs/coding-plan/opencode - Shows correct API URL and model name
  - Anthropic API format reference: https://docs.anthropic.com/en/api/messages

  **WHY Each Reference Matters**:
  - `minimax.ts`: Contains the API URL, default model, and endpoint path to update
  - `useLLMSettings.ts`: Contains frontend model dropdown options
  - MiniMax docs: Source of truth for correct API endpoint and model names

  **Acceptance Criteria**:

  **Automated Verification**:

  ```bash
  # Agent verifies model names in frontend:
  grep -q "MiniMax-M2.1" /home/ubuntu/manus-clone/client/src/hooks/useLLMSettings.ts
  # Assert: Exit code 0 (found the new model name)
  ```

  ```bash
  # Agent verifies API URL in backend:
  grep -q "api.minimax.io" /home/ubuntu/manus-clone/server/llm/providers/minimax.ts
  # Assert: Exit code 0 (found the new URL)
  ```

  ```bash
  # Agent verifies endpoint path:
  grep -q "anthropic/v1" /home/ubuntu/manus-clone/server/llm/providers/minimax.ts
  # Assert: Exit code 0 (found Anthropic-compatible endpoint)
  ```

  **Evidence to Capture:**
  - [ ] grep outputs confirming string replacements

  **Commit**: YES
  - Message: `fix(llm): update MiniMax API to Anthropic-compatible endpoint with correct model names`
  - Files: `server/llm/providers/minimax.ts`, `client/src/hooks/useLLMSettings.ts`
  - Pre-commit: `grep -q "MiniMax-M2.1" client/src/hooks/useLLMSettings.ts`

---

- [x] 3. Add LLM Test API Key Button

  **What to do**:
  - Add new tRPC procedure `llm.testKey` in `server/routers.ts`
  - The procedure should: accept provider + apiKey, make a minimal API call (e.g., simple completion), return success/failure
  - Add "Test API Key" button in `Builder.tsx` LLM settings section (after API key input)
  - Wire button to call `llm.testKey` mutation
  - Show toast on success ("API key is valid") or failure ("Invalid API key: {error}")
  - Follow pattern of existing `deploy.testConnection` endpoint

  **Must NOT do**:
  - Do NOT add complex caching or rate limiting
  - Do NOT store test results in database
  - Do NOT add provider auto-detection

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward feature addition following existing patterns
  - **Skills**: [`git-master`]
    - `git-master`: Commit both backend and frontend changes together
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Minor UI addition, not visual design work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `server/routers.ts:455-473` - `deploy.testConnection` pattern to follow
  - `server/_core/llm.ts:1-50` - invokeLLM function for making LLM calls
  - `client/src/pages/Builder.tsx:548-560` - handleTestConnection pattern

  **API/Type References**:
  - `server/routers.ts:94-102` - Existing llm router structure
  - `client/src/hooks/useLLMSettings.ts:3-9` - LLMSettings type definition

  **Test References**:
  - `server/llm/registry.test.ts` - How LLM providers are tested

  **WHY Each Reference Matters**:
  - `deploy.testConnection`: EXACT pattern to follow - same input structure, same toast handling
  - `invokeLLM`: Function to use for making the test call
  - `Builder.tsx:548-560`: Frontend pattern for test button click handler

  **Acceptance Criteria**:

  **Automated Verification**:

  ```bash
  # Agent verifies new endpoint exists in routers:
  grep -q "testKey" /home/ubuntu/manus-clone/server/routers.ts
  # Assert: Exit code 0
  ```

  ```bash
  # Agent verifies button exists in UI:
  grep -q "Test API Key\|Test.*Key\|testKey" /home/ubuntu/manus-clone/client/src/pages/Builder.tsx
  # Assert: Exit code 0
  ```

  **Evidence to Capture:**
  - [ ] grep outputs confirming endpoint and button exist

  **Commit**: YES
  - Message: `feat(llm): add Test API Key button to validate LLM provider credentials`
  - Files: `server/routers.ts`, `client/src/pages/Builder.tsx`
  - Pre-commit: `grep -q "testKey" server/routers.ts`

---

- [x] 4. Fix Sandpack Preview Issues

  **What to do**:
  - Add explicit `bundlerURL` option to SandpackProvider configuration
  - Use CodeSandbox's public bundler: `https://sandpack-bundler.codesandbox.io`
  - Add `autorun: true` and `recompileMode: "delayed"` options to prevent timeouts
  - Remove or fix external resources that may cause CSP issues (Tailwind CDN)
  - The "Preview mode" popup is likely from Sandpack's bundler - proper config should fix it

  **Must NOT do**:
  - Do NOT self-host Sandpack bundler
  - Do NOT add complex retry logic
  - Do NOT change the template structure (react, vue, vanilla)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration-only fix, single component, clear documentation
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for config changes
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not visual design, just configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `client/src/pages/Builder.tsx:1066-1079` - Current SandpackProvider configuration

  **External References**:
  - Sandpack docs: https://sandpack.codesandbox.io/docs/getting-started/usage
  - Sandpack bundlerURL option: https://sandpack.codesandbox.io/docs/advanced-usage/bundler

  **WHY Each Reference Matters**:
  - `Builder.tsx:1066-1079`: WHERE to add the bundlerURL configuration
  - Sandpack docs: Shows correct bundlerURL and options format

  **Acceptance Criteria**:

  **Automated Verification**:

  ```bash
  # Agent verifies bundlerURL is configured:
  grep -q "bundlerURL\|bundler" /home/ubuntu/manus-clone/client/src/pages/Builder.tsx
  # Assert: Exit code 0
  ```

  **For UI Verification** (using playwright skill later):

  ```
  # Agent navigates to builder:
  1. Navigate to: http://localhost:3000/builder
  2. Wait for: Sandpack iframe to load (selector: .sp-preview iframe)
  3. Wait for: No error overlay visible (selector: .sp-error-message should NOT exist)
  4. Screenshot: .sisyphus/evidence/task-4-sandpack-loaded.png
  ```

  **Evidence to Capture:**
  - [ ] grep output confirming bundlerURL config
  - [ ] Screenshot showing preview loads without error

  **Commit**: YES
  - Message: `fix(preview): configure Sandpack bundlerURL to resolve connection timeout`
  - Files: `client/src/pages/Builder.tsx`
  - Pre-commit: `grep -q "bundlerURL" client/src/pages/Builder.tsx`

---

- [x] 5. Restructure UI Layout (Preview-Centric)

  **What to do**:
  - Change layout from `[Chat 25% | Editor 40% | Preview 35%]` to `[Chat 20% | Preview 55% | EditorPanel 25%]`
  - EditorPanel (file tree + code editor) slides in from RIGHT when toggled
  - Add toggle button in header to show/hide editor panel
  - Use CSS `transform: translateX()` with transition for smooth sliding
  - Editor panel overlays or pushes preview (user preference: overlay)
  - Chat panel stays fixed on left

  **Must NOT do**:
  - Do NOT change Chat panel position or size
  - Do NOT add dark/light theme toggle
  - Do NOT add new panels or features
  - Do NOT change header layout beyond adding toggle button

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI restructuring with animation, needs visual attention
  - **Skills**: [`frontend-ui-ux`, `git-master`]
    - `frontend-ui-ux`: Layout restructuring requires UI expertise
    - `git-master`: Atomic commit for UI changes
  - **Skills Evaluated but Omitted**:
    - `playwright`: Will be used in Task 6 for verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: Task 4 (Sandpack must work first)

  **References**:

  **Pattern References**:
  - `client/src/pages/Builder.tsx:908-1085` - Current ResizablePanelGroup layout
  - `client/src/pages/Builder.tsx:634-656` - Header with framework selector and buttons

  **API/Type References**:
  - `@/components/ui/resizable` - ResizablePanelGroup, ResizablePanel, ResizableHandle components

  **External References**:
  - react-resizable-panels docs: https://react-resizable-panels.vercel.app/
  - CSS transitions: Standard `transition: transform 0.3s ease-in-out`

  **WHY Each Reference Matters**:
  - `Builder.tsx:908-1085`: The layout code to restructure
  - `Builder.tsx:634-656`: Where to add the toggle button
  - Resizable panels: Understand current implementation before modifying

  **Acceptance Criteria**:

  **Automated Verification** (using playwright skill):

  ```
  # Agent navigates to builder:
  1. Navigate to: http://localhost:3000/builder
  2. Wait for: page to fully load
  3. Assert: Preview panel is visible and takes majority of space
  4. Screenshot: .sisyphus/evidence/task-5-initial-layout.png
  5. Click: editor toggle button
  6. Wait for: editor panel animation to complete (300ms)
  7. Assert: Editor panel is visible
  8. Screenshot: .sisyphus/evidence/task-5-editor-open.png
  9. Click: editor toggle button again
  10. Assert: Editor panel is hidden
  ```

  **Evidence to Capture:**
  - [ ] Screenshot of initial layout (preview-centric)
  - [ ] Screenshot with editor panel open

  **Commit**: YES
  - Message: `feat(ui): restructure layout with preview-centric design and sliding editor panel`
  - Files: `client/src/pages/Builder.tsx`
  - Pre-commit: N/A (visual verification via Playwright)

---

- [x] 6. Create Playwright E2E Test

  **What to do**:
  - Install Playwright: `pnpm add -D @playwright/test`
  - Run Playwright install: `pnpm exec playwright install chromium`
  - Create `playwright.config.ts` with basic configuration
  - Create `tests/e2e/builder.spec.ts` with ONE test covering:
    1. Navigate to landing page (/)
    2. Navigate to builder (/builder)
    3. Open settings dialog
    4. Select MiniMax provider
    5. Enter API key (hardcoded: sk-cp-o-E9Y6JQgiyTGQlYNsaDkv_sd6fc1JSbTz0pQMeGSToNS-cQLXS9KQqMS7QUSEWEZogjC16Gr0PwY90Q3FFcCK4uiMqn3U4k78CpXMytIcEapCE4NahJF50)
    6. Click "Test API Key" button
    7. Verify success toast appears
    8. Close settings dialog
    9. Type prompt: "build a simple web page with a heading that says Hello World"
    10. Click Generate button
    11. Wait for generation to complete (agent status shows done or files appear)
    12. Verify preview panel shows content (iframe not empty)

  **Must NOT do**:
  - Do NOT create more than ONE test file
  - Do NOT add visual regression testing
  - Do NOT add multiple browser testing (chromium only)
  - Do NOT mock LLM responses (use real API for proof-of-concept)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: E2E test creation requires understanding full flow, debugging timing issues
  - **Skills**: [`playwright`, `git-master`]
    - `playwright`: REQUIRED for browser automation test creation
    - `git-master`: Commit test infrastructure
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI design, just test automation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2, 3, 5 (all must complete first)

  **References**:

  **Pattern References**:
  - `vitest.config.ts` - Existing test config pattern
  - `package.json` - Where to add playwright scripts

  **API/Type References**:
  - `client/src/pages/Builder.tsx` - Selectors for UI elements
  - `client/src/pages/Home.tsx` - Landing page structure

  **External References**:
  - Playwright docs: https://playwright.dev/docs/intro
  - Playwright best practices: https://playwright.dev/docs/best-practices

  **WHY Each Reference Matters**:
  - `Builder.tsx`: Need to know DOM structure for selectors
  - Playwright docs: Test structure and assertion patterns

  **Acceptance Criteria**:

  **Automated Verification**:

  ```bash
  # Agent installs Playwright:
  cd /home/ubuntu/manus-clone && pnpm add -D @playwright/test
  # Assert: Exit code 0
  ```

  ```bash
  # Agent installs browsers:
  cd /home/ubuntu/manus-clone && pnpm exec playwright install chromium
  # Assert: Exit code 0
  ```

  ```bash
  # Agent verifies test file exists:
  test -f /home/ubuntu/manus-clone/tests/e2e/builder.spec.ts
  # Assert: Exit code 0
  ```

  ```bash
  # Agent runs Playwright test (with app running):
  cd /home/ubuntu/manus-clone && pnpm exec playwright test tests/e2e/builder.spec.ts --project=chromium
  # Assert: Exit code 0
  # Assert: Output contains "1 passed"
  ```

  **Evidence to Capture:**
  - [ ] Playwright test output showing pass
  - [ ] Screenshots captured during test run (Playwright auto-captures on failure)

  **Commit**: YES
  - Message: `test(e2e): add Playwright E2E test for builder flow with MiniMax API validation`
  - Files: `playwright.config.ts`, `tests/e2e/builder.spec.ts`, `package.json`
  - Pre-commit: `pnpm exec playwright test tests/e2e/builder.spec.ts --project=chromium`

---

## Commit Strategy

| After Task | Message                                                                                  | Files                                                                   | Verification                    |
| ---------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| 1          | `fix(orchestrator): remove assign_coders as node to fix LangGraph Send API usage`        | `services/orchestrator/graph/workflow.py`                               | `pytest tests/test_workflow.py` |
| 2          | `fix(llm): update MiniMax API to Anthropic-compatible endpoint with correct model names` | `server/llm/providers/minimax.ts`, `client/src/hooks/useLLMSettings.ts` | grep verification               |
| 3          | `feat(llm): add Test API Key button to validate LLM provider credentials`                | `server/routers.ts`, `client/src/pages/Builder.tsx`                     | grep verification               |
| 4          | `fix(preview): configure Sandpack bundlerURL to resolve connection timeout`              | `client/src/pages/Builder.tsx`                                          | grep verification               |
| 5          | `feat(ui): restructure layout with preview-centric design and sliding editor panel`      | `client/src/pages/Builder.tsx`                                          | visual verification             |
| 6          | `test(e2e): add Playwright E2E test for builder flow with MiniMax API validation`        | `playwright.config.ts`, `tests/e2e/builder.spec.ts`, `package.json`     | `playwright test`               |

---

## Success Criteria

### Verification Commands

```bash
# All pytest tests pass
cd services/orchestrator && pytest -v
# Expected: All tests pass, exit code 0

# Workflow starts successfully
curl -X POST http://localhost:8001/workflow/start \
  -H "Content-Type: application/json" \
  -d '{"task": "hello", "framework": "react"}'
# Expected: {"workflow_id": "...", "status": "started"}

# Playwright test passes
pnpm exec playwright test tests/e2e/builder.spec.ts
# Expected: 1 passed, exit code 0
```

### Final Checklist

- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All pytest tests pass
- [x] Playwright E2E test passes
- [x] MiniMax dropdown shows correct models
- [x] Preview panel is center/main view
- [x] Editor slides from right
- [x] Test API Key button works
- [x] No Sandpack timeout errors
