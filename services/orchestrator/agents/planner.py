"""Planner agent for task decomposition."""


def plan_task(task: str, framework: str) -> dict:
    """
    Decompose a task into subtasks.
    
    Args:
        task: The main task to decompose
        framework: The target framework (e.g., 'react', 'vue')
    
    Returns:
        Dictionary with subtasks list
    """
    # Stub implementation - will be implemented in Task 6
    return {
        "subtasks": [
            "Analyze requirements",
            "Design architecture",
            "Create components",
            "Add styling",
            "Test functionality"
        ]
    }
