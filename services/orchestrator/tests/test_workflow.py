"""Tests for LangGraph workflow."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from graph.workflow import (
    AgentState,
    create_initial_state,
    merge_dicts,
    planner_node,
    assign_coders_node,
    coder_node,
    reviewer_node,
)


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


# --- Unit Tests for State ---

def test_create_initial_state():
    """Test initial state creation."""
    state = create_initial_state("Build a todo app", "react")
    
    assert state["task"] == "Build a todo app"
    assert state["framework"] == "react"
    assert state["plan"] == []
    assert state["files"] == {}
    assert state["iteration"] == 0
    assert state["status"] == "started"
    assert "workflow_id" in state
    assert len(state["workflow_id"]) == 36  # UUID format


def test_merge_dicts():
    """Test dict reducer function."""
    # Test merging
    result = merge_dicts({"a": "1"}, {"b": "2"})
    assert result == {"a": "1", "b": "2"}
    
    # Test overwrite
    result = merge_dicts({"a": "1"}, {"a": "2"})
    assert result == {"a": "2"}
    
    # Test None handling
    result = merge_dicts(None, {"a": "1"})
    assert result == {"a": "1"}
    
    result = merge_dicts({"a": "1"}, None)
    assert result == {"a": "1"}


# --- Unit Tests for Nodes ---

@patch("graph.workflow.plan_task")
def test_planner_node(mock_plan_task):
    """Test planner node returns Command with plan."""
    mock_plan_task.return_value = {
        "subtasks": ["Create App", "Add styling"]
    }
    
    state: AgentState = {
        "workflow_id": "test-123",
        "task": "Build an app",
        "framework": "react",
        "plan": [],
        "files": {},
        "review_feedback": None,
        "iteration": 0,
        "status": "started",
        "current_agent": "",
        "error": None,
    }
    
    result = planner_node(state)
    
    # Command should have update and goto
    assert result.update["plan"] == ["Create App", "Add styling"]
    assert result.update["current_agent"] == "planner"
    assert result.goto == "assign_coders"


def test_assign_coders_node():
    """Test assign_coders creates Send for each subtask."""
    state: AgentState = {
        "workflow_id": "test-123",
        "task": "Build an app",
        "framework": "react",
        "plan": ["Task 1", "Task 2", "Task 3"],
        "files": {},
        "review_feedback": None,
        "iteration": 0,
        "status": "planning_complete",
        "current_agent": "planner",
        "error": None,
    }
    
    result = assign_coders_node(state)
    
    assert len(result) == 3
    for i, send in enumerate(result):
        assert send.node == "coder"
        assert send.arg["subtask"] == f"Task {i + 1}"
        assert send.arg["framework"] == "react"


@patch("graph.workflow.generate_code")
def test_coder_node(mock_generate_code):
    """Test coder node generates files."""
    mock_generate_code.return_value = {
        "files": {"/App.jsx": "// App code"}
    }
    
    state = {
        "subtask": "Create App component",
        "framework": "react",
        "context": {},
    }
    
    result = coder_node(state)
    
    assert "files" in result
    assert "/App.jsx" in result["files"]


@patch("graph.workflow.review_code")
def test_reviewer_node_approved(mock_review_code):
    """Test reviewer approves code and ends workflow."""
    mock_review_code.return_value = {
        "approved": True,
        "feedback": "LGTM",
    }
    
    state: AgentState = {
        "workflow_id": "test-123",
        "task": "Build an app",
        "framework": "react",
        "plan": ["Task 1"],
        "files": {"/App.jsx": "// code"},
        "review_feedback": None,
        "iteration": 0,
        "status": "coding",
        "current_agent": "coder",
        "error": None,
    }
    
    result = reviewer_node(state)
    
    assert result.update["status"] == "completed"
    # Note: END is a string constant "__end__" in LangGraph
    assert result.goto == "__end__"


@patch("graph.workflow.review_code")
def test_reviewer_node_needs_revision(mock_review_code):
    """Test reviewer requests revision."""
    mock_review_code.return_value = {
        "approved": False,
        "feedback": "Missing error handling",
    }
    
    state: AgentState = {
        "workflow_id": "test-123",
        "task": "Build an app",
        "framework": "react",
        "plan": ["Task 1"],
        "files": {"/App.jsx": "// code"},
        "review_feedback": None,
        "iteration": 0,
        "status": "coding",
        "current_agent": "coder",
        "error": None,
    }
    
    result = reviewer_node(state)
    
    assert result.update["status"] == "needs_revision"
    assert result.update["iteration"] == 1
    assert result.goto == "coder"


@patch("graph.workflow.review_code")
def test_reviewer_node_max_iterations(mock_review_code):
    """Test reviewer stops at max iterations."""
    mock_review_code.return_value = {
        "approved": False,
        "feedback": "Still has issues",
    }
    
    state: AgentState = {
        "workflow_id": "test-123",
        "task": "Build an app",
        "framework": "react",
        "plan": ["Task 1"],
        "files": {"/App.jsx": "// code"},
        "review_feedback": "Previous feedback",
        "iteration": 3,  # At max
        "status": "needs_revision",
        "current_agent": "reviewer",
        "error": None,
    }
    
    result = reviewer_node(state)
    
    assert result.update["status"] == "completed_with_issues"
    assert result.goto == "__end__"


# --- API Integration Tests ---

def test_health_endpoint(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Manus Orchestrator"


def test_start_workflow(client):
    """Test starting a workflow."""
    response = client.post(
        "/workflow/start",
        json={"task": "Create a todo app", "framework": "react"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "workflow_id" in data
    assert data["status"] == "started"


def test_workflow_status_not_found(client):
    """Test getting status of non-existent workflow."""
    response = client.get("/workflow/nonexistent/status")
    assert response.status_code == 404


def test_workflow_result_not_found(client):
    """Test getting result of non-existent workflow."""
    response = client.get("/workflow/nonexistent/result")
    assert response.status_code == 404


def test_list_workflows(client):
    """Test listing workflows."""
    response = client.get("/workflows")
    assert response.status_code == 200
    data = response.json()
    assert "workflows" in data
    assert "count" in data
