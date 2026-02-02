"""LangGraph workflow for agent orchestration.

Implements Orchestrator-Worker pattern with:
- Planner: Decomposes task into subtasks
- Coder: Generates code for each subtask (fan-out with Send)
- Reviewer: Reviews and provides feedback (loops back if fixes needed)
"""

from typing import TypedDict, Annotated, Literal, Callable, Optional, Any
import uuid
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send, Command
from langgraph.checkpoint.memory import MemorySaver

from agents.planner import plan_task
from agents.coder import generate_code
from agents.reviewer import review_code

# Lazy import for PostgresSaver (requires libpq)
PostgresSaver: Optional[Any] = None
try:
    from langgraph.checkpoint.postgres import PostgresSaver as _PostgresSaver
    PostgresSaver = _PostgresSaver
except ImportError:
    pass


# --- Reducer Functions ---

def merge_dicts(left: dict | None, right: dict | None) -> dict:
    """Reducer to merge dicts from parallel coder invocations."""
    if left is None:
        left = {}
    if right is None:
        right = {}
    return {**left, **right}


# --- State Schemas ---

class AgentState(TypedDict):
    """Main state schema for the agent workflow."""
    workflow_id: str
    task: str
    framework: str
    plan: list[str]
    # Use Annotated with reducer to merge dicts from parallel coders
    files: Annotated[dict[str, str], merge_dicts]
    review_feedback: str | None
    iteration: int
    status: str
    current_agent: str
    error: str | None


class CoderState(TypedDict):
    """State for individual coder invocations."""
    subtask: str
    framework: str
    context: dict


# --- Node Functions ---

def planner_node(state: AgentState) -> Command[Literal["assign_coders"]]:
    """
    Planner node: Decomposes task into subtasks.
    
    Uses the planner agent to break down the main task into
    actionable subtasks that can be distributed to coders.
    """
    result = plan_task(state["task"], state["framework"])
    subtasks = result.get("subtasks", [])
    
    return Command(
        update={
            "plan": subtasks,
            "current_agent": "planner",
            "status": "planning_complete",
        },
        goto="assign_coders"
    )


def assign_coders_node(state: AgentState) -> list[Send]:
    """
    Fan-out node: Distributes subtasks to parallel coder instances.
    
    Uses LangGraph's Send API to dynamically create coder
    invocations for each subtask in the plan.
    """
    sends = []
    for subtask in state.get("plan", []):
        sends.append(
            Send("coder", {
                "subtask": subtask,
                "framework": state["framework"],
                "context": {
                    "task": state["task"],
                    "existing_files": state.get("files", {}),
                    "review_feedback": state.get("review_feedback"),
                }
            })
        )
    return sends


def coder_node(state: CoderState) -> dict:
    """
    Coder node: Generates code for a single subtask.
    
    Called in parallel for each subtask. Returns files dict
    that gets merged into main state via the reducer.
    """
    result = generate_code(
        state["subtask"],
        state["framework"],
        state.get("context")
    )
    return {"files": result.get("files", {})}


def reviewer_node(state: AgentState) -> Command[Literal["coder", "__end__"]]:
    """
    Reviewer node: Reviews generated code and decides next action.
    
    If code needs fixes and iteration limit not reached,
    routes back to coder. Otherwise completes workflow.
    """
    files = state.get("files", {})
    framework = state["framework"]
    iteration = state.get("iteration", 0)
    
    result = review_code(files, framework)
    approved = result.get("approved", True)
    feedback = result.get("feedback", "")
    
    # Check if we need another iteration
    max_iterations = 3
    if not approved and iteration < max_iterations:
        return Command(
            update={
                "review_feedback": feedback,
                "iteration": iteration + 1,
                "current_agent": "reviewer",
                "status": "needs_revision",
            },
            goto="coder"
        )
    
    # Complete the workflow
    final_status = "completed" if approved else "completed_with_issues"
    return Command(
        update={
            "review_feedback": feedback if not approved else None,
            "current_agent": "reviewer",
            "status": final_status,
        },
        goto=END
    )


def coder_revision_node(state: AgentState) -> dict:
    """
    Single coder node for revisions based on review feedback.
    
    Unlike the fan-out pattern for initial coding, revisions
    are handled by a single coder with full context.
    """
    result = generate_code(
        subtask="Apply review feedback",
        framework=state["framework"],
        context={
            "task": state["task"],
            "existing_files": state.get("files", {}),
            "review_feedback": state.get("review_feedback"),
        }
    )
    return {
        "files": result.get("files", {}),
        "current_agent": "coder",
        "status": "coding_revision",
    }


# --- Workflow Builder ---

def create_workflow(checkpointer=None):
    """
    Create the LangGraph workflow for agent orchestration.
    
    Args:
        checkpointer: Optional checkpointer for state persistence.
                     If None, workflow runs without persistence.
    
    Returns:
        Compiled LangGraph workflow
    """
    # Build the state graph
    builder = StateGraph(AgentState)
    
    # Add nodes
    builder.add_node("planner", planner_node)
    builder.add_node("coder", coder_node)
    builder.add_node("reviewer", reviewer_node)
    builder.add_node("coder_revision", coder_revision_node)
    
    # Add edges
    builder.add_edge(START, "planner")
    # planner → assign_coders is handled by Command in planner_node
    
    # assign_coders fans out via Send, then converges to reviewer
    builder.add_conditional_edges(
        "assign_coders",
        assign_coders_node,
        ["coder"]
    )
    builder.add_edge("coder", "reviewer")
    # reviewer → END or coder_revision is handled by Command in reviewer_node
    
    # coder_revision always goes back to reviewer
    builder.add_edge("coder_revision", "reviewer")
    
    # Compile with optional checkpointer
    return builder.compile(checkpointer=checkpointer)


def create_checkpointer(db_uri: str | None = None) -> MemorySaver | Any:
    """
    Create a checkpointer for workflow persistence.
    
    Uses PostgreSQL if db_uri is provided and PostgresSaver is available,
    otherwise falls back to in-memory storage.
    
    Args:
        db_uri: PostgreSQL connection string (optional)
        
    Returns:
        Configured checkpointer instance (PostgresSaver or MemorySaver)
    """
    if db_uri and PostgresSaver is not None:
        checkpointer = PostgresSaver.from_conn_string(db_uri)
        checkpointer.setup()
        return checkpointer
    
    # Fallback to in-memory saver
    return MemorySaver()


def create_initial_state(task: str, framework: str) -> AgentState:
    """
    Create the initial state for a new workflow.
    
    Args:
        task: The main task description
        framework: Target framework (react, vue, etc.)
        
    Returns:
        Initialized AgentState
    """
    return AgentState(
        workflow_id=str(uuid.uuid4()),
        task=task,
        framework=framework,
        plan=[],
        files={},
        review_feedback=None,
        iteration=0,
        status="started",
        current_agent="",
        error=None,
    )
