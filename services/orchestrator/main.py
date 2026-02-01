"""FastAPI application for LangGraph agent orchestration."""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os
import asyncio
from typing import Optional
from dotenv import load_dotenv

from graph.workflow import (
    create_workflow,
    create_checkpointer,
    create_initial_state,
    AgentState,
)
from agents.planner import plan_task
from agents.coder import generate_code
from agents.reviewer import review_code

# Load environment variables
load_dotenv()


# --- Pydantic Models ---

class WorkflowRequest(BaseModel):
    """Request model for starting a workflow."""
    task: str
    framework: str = "react"


class WorkflowStatusResponse(BaseModel):
    """Response model for workflow status."""
    workflow_id: str
    status: str
    current_agent: str
    iteration: int
    error: Optional[str] = None


class WorkflowResultResponse(BaseModel):
    """Response model for workflow result."""
    workflow_id: str
    status: str
    files: dict[str, str]
    plan: list[str]
    explanation: Optional[str] = None


# --- Agent Test Request/Response Models ---

class PlannerTestRequest(BaseModel):
    """Request model for testing planner agent."""
    task: str
    framework: str = "react"


class PlannerTestResponse(BaseModel):
    """Response model for planner test."""
    subtasks: list[str]
    reasoning: Optional[str] = None
    error: Optional[str] = None


class CoderTestRequest(BaseModel):
    """Request model for testing coder agent."""
    subtask: str
    framework: str = "react"
    context: Optional[dict] = None


class CoderTestResponse(BaseModel):
    """Response model for coder test."""
    files: dict[str, str]
    explanation: Optional[str] = None
    error: Optional[str] = None


class ReviewerTestRequest(BaseModel):
    """Request model for testing reviewer agent."""
    files: dict[str, str]
    framework: str = "react"


class ReviewerTestResponse(BaseModel):
    """Response model for reviewer test."""
    approved: bool
    feedback: str
    score: Optional[int] = None
    issues: Optional[list[str]] = None
    suggestions: Optional[list[str]] = None


# --- In-Memory Workflow Store ---
# For MVP, store workflows in memory. Production would use Redis/PostgreSQL.

_workflows: dict[str, AgentState] = {}
_workflow_tasks: dict[str, asyncio.Task] = {}


# --- App Lifecycle ---

def get_db_uri() -> Optional[str]:
    """Get PostgreSQL connection string from environment."""
    return os.getenv("DATABASE_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup: Initialize checkpointer if DB is configured
    db_uri = get_db_uri()
    if db_uri:
        try:
            app.state.checkpointer = create_checkpointer(db_uri)
            print(f"Initialized PostgreSQL checkpointer")
        except Exception as e:
            print(f"Warning: Failed to initialize checkpointer: {e}")
            app.state.checkpointer = None
    else:
        print("No DATABASE_URL configured, running without persistence")
        app.state.checkpointer = None
    
    # Initialize workflow
    app.state.workflow = create_workflow(app.state.checkpointer)
    
    yield
    
    # Shutdown: Cancel any running tasks
    for task_id, task in _workflow_tasks.items():
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="Manus Orchestrator",
    description="LangGraph-based agent orchestration service",
    version="0.1.0",
    lifespan=lifespan,
)


# --- Helper Functions ---

async def run_workflow(workflow_id: str, initial_state: AgentState):
    """Run workflow in background and update state."""
    try:
        # Update status to running
        _workflows[workflow_id] = {**initial_state, "status": "running"}
        
        # Get the compiled workflow
        workflow = app.state.workflow
        
        # Run the workflow with thread config for checkpointing
        config = {"configurable": {"thread_id": workflow_id}}
        
        # Invoke workflow synchronously (LangGraph handles async internally)
        result = await asyncio.to_thread(
            workflow.invoke,
            initial_state,
            config
        )
        
        # Store final result - cast result to proper type
        final_state: AgentState = {**result, "workflow_id": workflow_id}  # type: ignore
        _workflows[workflow_id] = final_state
        
    except Exception as e:
        # Update state with error
        current = _workflows.get(workflow_id, initial_state)
        error_state: AgentState = {
            **current,
            "status": "failed",
            "error": str(e),
        }  # type: ignore
        _workflows[workflow_id] = error_state


# --- API Endpoints ---

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({"status": "ok"})


@app.get("/")
async def root():
    """Root endpoint."""
    return JSONResponse({
        "service": "Manus Orchestrator",
        "version": "0.1.0",
        "status": "running"
    })


@app.post("/workflow/start")
async def start_workflow(
    request: WorkflowRequest,
    background_tasks: BackgroundTasks
) -> dict:
    """
    Start a new agent workflow.
    
    Creates a new workflow that orchestrates Planner → Coder → Reviewer
    to generate code for the given task.
    
    Returns workflow_id for tracking status.
    """
    # Create initial state
    initial_state = create_initial_state(request.task, request.framework)
    workflow_id = initial_state["workflow_id"]
    
    # Store initial state
    _workflows[workflow_id] = initial_state
    
    # Start workflow in background
    task = asyncio.create_task(run_workflow(workflow_id, initial_state))
    _workflow_tasks[workflow_id] = task
    
    return {
        "workflow_id": workflow_id,
        "status": "started",
    }


@app.get("/workflow/{workflow_id}/status")
async def get_workflow_status(workflow_id: str) -> WorkflowStatusResponse:
    """
    Get the current status of a workflow.
    
    Returns the current agent, iteration count, and overall status.
    """
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    state = _workflows[workflow_id]
    
    return WorkflowStatusResponse(
        workflow_id=workflow_id,
        status=state.get("status", "unknown"),
        current_agent=state.get("current_agent", ""),
        iteration=state.get("iteration", 0),
        error=state.get("error"),
    )


@app.get("/workflow/{workflow_id}/result")
async def get_workflow_result(workflow_id: str) -> WorkflowResultResponse:
    """
    Get the result of a completed workflow.
    
    Returns generated files, plan, and any explanation.
    """
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    state = _workflows[workflow_id]
    status = state.get("status", "unknown")
    
    # Check if workflow is still running
    if status in ("started", "running", "planning_complete", "needs_revision", "coding_revision"):
        raise HTTPException(
            status_code=202,
            detail=f"Workflow still in progress: {status}"
        )
    
    # Build explanation from feedback if any
    explanation = None
    if state.get("review_feedback"):
        explanation = f"Review feedback: {state['review_feedback']}"
    
    return WorkflowResultResponse(
        workflow_id=workflow_id,
        status=status,
        files=state.get("files", {}),
        plan=state.get("plan", []),
        explanation=explanation,
    )


@app.get("/workflows")
async def list_workflows() -> dict:
    """
    List all workflows and their current status.
    
    For debugging and monitoring purposes.
    """
    workflows = []
    for wid, state in _workflows.items():
        workflows.append({
            "workflow_id": wid,
            "status": state.get("status", "unknown"),
            "current_agent": state.get("current_agent", ""),
            "task": state.get("task", "")[:50],  # Truncate for listing
        })
    
    return {"workflows": workflows, "count": len(workflows)}


# --- Agent Test Endpoints ---

@app.post("/agents/planner/test")
async def test_planner(request: PlannerTestRequest) -> PlannerTestResponse:
    """
    Test the planner agent independently.
    
    Decomposes a task into subtasks without running the full workflow.
    Useful for testing and debugging the planner's behavior.
    """
    result = await asyncio.to_thread(plan_task, request.task, request.framework)
    
    return PlannerTestResponse(
        subtasks=result.get("subtasks", []),
        reasoning=result.get("reasoning"),
        error=result.get("error"),
    )


@app.post("/agents/coder/test")
async def test_coder(request: CoderTestRequest) -> CoderTestResponse:
    """
    Test the coder agent independently.
    
    Generates code for a specific subtask without running the full workflow.
    Useful for testing and debugging the coder's behavior.
    """
    result = await asyncio.to_thread(
        generate_code,
        request.subtask,
        request.framework,
        request.context,
    )
    
    return CoderTestResponse(
        files=result.get("files", {}),
        explanation=result.get("explanation"),
        error=result.get("error"),
    )


@app.post("/agents/reviewer/test")
async def test_reviewer(request: ReviewerTestRequest) -> ReviewerTestResponse:
    """
    Test the reviewer agent independently.
    
    Reviews provided code files without running the full workflow.
    Useful for testing and debugging the reviewer's behavior.
    """
    result = await asyncio.to_thread(
        review_code,
        request.files,
        request.framework,
    )
    
    return ReviewerTestResponse(
        approved=result.get("approved", True),
        feedback=result.get("feedback", ""),
        score=result.get("score"),
        issues=result.get("issues"),
        suggestions=result.get("suggestions"),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
    )
