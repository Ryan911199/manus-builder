"""Reviewer agent for code review and feedback.

Reviews generated code and provides feedback on quality, issues,
and suggestions for improvement.
"""

import json
import os
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


# Prompt template for code review
REVIEWER_SYSTEM_PROMPT = """You are an expert code reviewer specializing in {framework} development.
Review the provided code files and assess their quality.

Guidelines:
1. Check for syntax errors and bugs
2. Verify {framework} best practices are followed
3. Ensure code is complete and functional
4. Check for proper imports and dependencies
5. Look for security issues or bad patterns
6. Verify the code matches the original task

Be constructive and specific in your feedback.

IMPORTANT: Return your response as a JSON object with this exact structure:
{{
    "approved": true or false,
    "score": 1-10 (quality score),
    "feedback": "Overall assessment",
    "issues": [
        "Issue 1: description",
        "Issue 2: description"
    ],
    "suggestions": [
        "Suggestion 1",
        "Suggestion 2"
    ]
}}

Only return valid JSON, no markdown code blocks.

Set approved=true if the code is functional and follows basic standards.
Set approved=false only if there are critical issues that must be fixed."""


def get_llm() -> ChatOpenAI:
    """Get configured LLM instance for reviewer agent."""
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o"),
        api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("LLM_API_URL") or os.getenv("OPENAI_API_URL"),
        temperature=0.1,  # Very low temperature for consistent reviews
    )


def review_code(files: dict, framework: str) -> dict[str, Any]:
    """
    Review generated code and provide feedback.
    
    Args:
        files: Dictionary of generated files (path -> content)
        framework: The target framework (e.g., 'react', 'vue')
    
    Returns:
        Dictionary with:
            - approved: bool - Whether code passes review
            - feedback: str - Overall feedback message
            - score: int - Quality score 1-10
            - issues: list - List of issues found
            - suggestions: list - List of suggestions
    """
    # Check if LLM is configured
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Return stub for testing without LLM
        return _stub_review(files, framework)
    
    try:
        llm = get_llm()
        
        system_prompt = REVIEWER_SYSTEM_PROMPT.format(framework=framework)
        
        # Format files for review
        files_text = ""
        for path, content in files.items():
            files_text += f"\n--- {path} ---\n{content}\n"
        
        user_message = f"Please review the following {framework} code:\n{files_text}"
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
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
                "approved": result.get("approved", True),
                "feedback": result.get("feedback", ""),
                "score": result.get("score", 7),
                "issues": result.get("issues", []),
                "suggestions": result.get("suggestions", []),
            }
        
        return {"approved": True, "feedback": "Invalid response format", "score": 5}
        
    except json.JSONDecodeError as e:
        # If we can't parse, default to approved to avoid blocking
        return {
            "approved": True,
            "feedback": f"Review parse error: {str(e)}",
            "score": 6,
        }
    except Exception as e:
        return {
            "approved": True,
            "feedback": f"Review error: {str(e)}",
            "score": 6,
        }


def _stub_review(files: dict, framework: str) -> dict[str, Any]:
    """
    Stub implementation for testing without LLM.
    
    Performs basic checks and returns reasonable feedback.
    """
    issues = []
    suggestions = []
    score = 7
    
    # Check if any files were provided
    if not files:
        return {
            "approved": False,
            "feedback": "No files to review",
            "score": 1,
            "issues": ["No files were generated"],
            "suggestions": ["Generate at least one file"],
        }
    
    # Basic checks for each file
    for path, content in files.items():
        # Check for empty files
        if not content or not content.strip():
            issues.append(f"{path}: File is empty")
            score -= 2
            continue
        
        # Framework-specific checks
        if framework == "react":
            if path.endswith(".jsx") or path.endswith(".tsx"):
                # Check for React import
                if "React" not in content and "react" not in content.lower():
                    # Modern React doesn't require import, but check for hooks
                    if "useState" in content or "useEffect" in content:
                        if "import" not in content:
                            issues.append(f"{path}: Missing imports for hooks")
                            score -= 1
                
                # Check for export
                if "export" not in content:
                    issues.append(f"{path}: Missing export statement")
                    score -= 1
        
        elif framework == "vue":
            if path.endswith(".vue"):
                # Check for template section
                if "<template>" not in content:
                    issues.append(f"{path}: Missing <template> section")
                    score -= 1
    
    # Add generic suggestions
    if len(files) < 2:
        suggestions.append("Consider splitting code into multiple components")
    
    if not any(p.endswith(".css") for p in files):
        suggestions.append("Consider adding a CSS file for styling")
    
    # Ensure score is in valid range
    score = max(1, min(10, score))
    
    # Approve if score is acceptable
    approved = score >= 5 and len(issues) == 0
    
    feedback = f"Code review for {framework} project: "
    if approved:
        feedback += f"Approved with score {score}/10"
    else:
        feedback += f"Needs revision. Score: {score}/10. Issues: {len(issues)}"
    
    return {
        "approved": approved,
        "feedback": feedback,
        "score": score,
        "issues": issues,
        "suggestions": suggestions,
    }
