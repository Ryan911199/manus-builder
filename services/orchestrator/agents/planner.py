"""Planner agent for task decomposition.

Decomposes a main task into actionable subtasks that can be distributed
to coder agents for parallel code generation.
"""

import json
import os
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


# Prompt template for task decomposition
PLANNER_SYSTEM_PROMPT = """You are an expert software architect and planner. Your job is to break down 
a software development task into clear, actionable subtasks that a coder can implement.

Guidelines:
1. Create 3-7 subtasks (not too few, not too many)
2. Each subtask should be specific and implementable
3. Order subtasks logically (dependencies first)
4. Include both component creation and integration tasks
5. Consider the framework's best practices

Framework: {framework}

IMPORTANT: Return your response as a JSON object with this exact structure:
{{
    "subtasks": [
        "Subtask 1: Description of what to implement",
        "Subtask 2: Description of what to implement",
        ...
    ],
    "reasoning": "Brief explanation of why you chose this breakdown"
}}

Only return valid JSON, no markdown code blocks."""


def get_llm() -> ChatOpenAI:
    """Get configured LLM instance for planner agent."""
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o"),
        api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("LLM_API_URL") or os.getenv("OPENAI_API_URL"),
        temperature=0.3,  # Lower temperature for more consistent planning
    )


def plan_task(task: str, framework: str) -> dict[str, Any]:
    """
    Decompose a task into subtasks using LLM.
    
    Args:
        task: The main task to decompose
        framework: The target framework (e.g., 'react', 'vue')
    
    Returns:
        Dictionary with subtasks list and optional reasoning
    """
    # Check if LLM is configured
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Return stub for testing without LLM
        return _stub_plan(task, framework)
    
    try:
        llm = get_llm()
        
        system_prompt = PLANNER_SYSTEM_PROMPT.format(framework=framework)
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Task: {task}"),
        ]
        
        response = llm.invoke(messages)
        content = response.content
        
        # Parse JSON response
        if isinstance(content, str):
            # Clean up potential markdown formatting
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content.rsplit("```", 1)[0]
            
            result = json.loads(content)
            return {
                "subtasks": result.get("subtasks", []),
                "reasoning": result.get("reasoning", ""),
            }
        
        return {"subtasks": [], "error": "Invalid response format"}
        
    except json.JSONDecodeError as e:
        return {"subtasks": [], "error": f"Failed to parse LLM response: {str(e)}"}
    except Exception as e:
        return {"subtasks": [], "error": f"LLM error: {str(e)}"}


def _stub_plan(task: str, framework: str) -> dict[str, Any]:
    """
    Stub implementation for testing without LLM.
    
    Returns a reasonable plan based on common patterns.
    """
    task_lower = task.lower()
    
    # Common subtasks based on task keywords
    if "todo" in task_lower:
        subtasks = [
            "Create main App component with state management",
            "Create TodoList component to display items",
            "Create TodoItem component with completion toggle",
            "Create AddTodo component for adding new items",
            "Add styling with CSS",
        ]
    elif "counter" in task_lower:
        subtasks = [
            "Create Counter component with state",
            "Add increment and decrement buttons",
            "Display current count value",
            "Add styling",
        ]
    elif "form" in task_lower:
        subtasks = [
            "Create Form component with inputs",
            "Add form validation",
            "Handle form submission",
            "Add styling and feedback messages",
        ]
    else:
        # Generic subtasks
        subtasks = [
            f"Create main App component for {framework}",
            "Implement core functionality",
            "Add user interface elements",
            "Add styling and polish",
            "Wire up event handlers",
        ]
    
    return {
        "subtasks": subtasks,
        "reasoning": f"Standard {framework} application structure for: {task}",
    }
