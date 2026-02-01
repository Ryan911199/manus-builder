"""Coder agent for code generation.

Generates code for specific subtasks. Supports multi-file output
and can incorporate review feedback for revisions.
"""

import json
import os
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


# Prompt template for code generation
CODER_SYSTEM_PROMPT = """You are an expert {framework} developer. Generate clean, working code based on the subtask.

Framework: {framework}

Guidelines:
1. Generate complete, working code
2. Follow {framework} best practices
3. Use modern syntax and patterns
4. Include proper imports
5. Add helpful comments for complex logic
6. Generate multiple files if needed (components, styles, etc.)

{existing_context}
{feedback_context}

IMPORTANT: Return your response as a JSON object with this exact structure:
{{
    "files": {{
        "/path/to/file.ext": "file content here",
        "/AnotherFile.jsx": "file content here"
    }},
    "explanation": "Brief explanation of what was created"
}}

File paths should start with / and use appropriate extensions for {framework}.

For React projects, use:
- .jsx for components
- .css for styles
- Use functional components with hooks

For Vue projects, use:
- .vue for single-file components
- .js for logic files

Only return valid JSON, no markdown code blocks."""


def get_llm() -> ChatOpenAI:
    """Get configured LLM instance for coder agent."""
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o"),
        api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("LLM_API_URL") or os.getenv("OPENAI_API_URL"),
        temperature=0.2,  # Low temperature for consistent code generation
    )


def generate_code(subtask: str, framework: str, context: dict | None = None) -> dict[str, Any]:
    """
    Generate code for a specific subtask.
    
    Args:
        subtask: The subtask to generate code for
        framework: The target framework (e.g., 'react', 'vue')
        context: Additional context including:
            - task: Original main task
            - existing_files: Dict of files already generated
            - review_feedback: Feedback from reviewer for revisions
    
    Returns:
        Dictionary with generated files and explanation
    """
    context = context or {}
    
    # Check if LLM is configured
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Return stub for testing without LLM
        return _stub_code(subtask, framework, context)
    
    try:
        llm = get_llm()
        
        # Build context strings for the prompt
        existing_context = ""
        if context.get("existing_files"):
            existing_context = f"\nExisting files in the project:\n{json.dumps(context['existing_files'], indent=2)}\n"
        
        feedback_context = ""
        if context.get("review_feedback"):
            feedback_context = f"\nReviewer feedback to address:\n{context['review_feedback']}\n"
        
        system_prompt = CODER_SYSTEM_PROMPT.format(
            framework=framework,
            existing_context=existing_context,
            feedback_context=feedback_context,
        )
        
        # Build user message with task context
        user_message = f"Subtask: {subtask}"
        if context.get("task"):
            user_message = f"Main task: {context['task']}\n\n{user_message}"
        
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
                "files": result.get("files", {}),
                "explanation": result.get("explanation", ""),
            }
        
        return {"files": {}, "error": "Invalid response format"}
        
    except json.JSONDecodeError as e:
        return {"files": {}, "error": f"Failed to parse LLM response: {str(e)}"}
    except Exception as e:
        return {"files": {}, "error": f"LLM error: {str(e)}"}


def _stub_code(subtask: str, framework: str, context: dict) -> dict[str, Any]:
    """
    Stub implementation for testing without LLM.
    
    Returns basic code based on subtask keywords.
    """
    subtask_lower = subtask.lower()
    files: dict[str, str] = {}
    
    if framework == "react":
        if "app" in subtask_lower:
            files["/App.jsx"] = '''import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [items, setItems] = useState([]);
  
  return (
    <div className="app">
      <h1>My App</h1>
      {/* Content here */}
    </div>
  );
}
'''
        elif "list" in subtask_lower or "todo" in subtask_lower:
            files["/TodoList.jsx"] = '''import React from 'react';

export default function TodoList({ items, onToggle, onDelete }) {
  return (
    <ul className="todo-list">
      {items.map((item, index) => (
        <li key={index} className={item.completed ? 'completed' : ''}>
          <span onClick={() => onToggle(index)}>{item.text}</span>
          <button onClick={() => onDelete(index)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
'''
        elif "item" in subtask_lower:
            files["/TodoItem.jsx"] = '''import React from 'react';

export default function TodoItem({ item, onToggle, onDelete }) {
  return (
    <li className={`todo-item ${item.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={item.completed}
        onChange={onToggle}
      />
      <span>{item.text}</span>
      <button onClick={onDelete}>×</button>
    </li>
  );
}
'''
        elif "add" in subtask_lower or "form" in subtask_lower:
            files["/AddTodo.jsx"] = '''import React, { useState } from 'react';

export default function AddTodo({ onAdd }) {
  const [text, setText] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="add-todo">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add new item..."
      />
      <button type="submit">Add</button>
    </form>
  );
}
'''
        elif "styl" in subtask_lower or "css" in subtask_lower:
            files["/styles.css"] = '''.app {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  font-family: sans-serif;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.todo-item.completed span {
  text-decoration: line-through;
  color: #888;
}

.add-todo {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.add-todo input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-todo button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
'''
        else:
            # Generic component
            files["/Component.jsx"] = f'''import React from 'react';

export default function Component() {{
  return (
    <div className="component">
      {{/* {subtask} */}}
    </div>
  );
}}
'''
    elif framework == "vue":
        if "app" in subtask_lower:
            files["/App.vue"] = '''<template>
  <div id="app">
    <h1>My App</h1>
    <!-- Content here -->
  </div>
</template>

<script setup>
import { ref } from 'vue';

const items = ref([]);
</script>

<style scoped>
#app {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}
</style>
'''
        else:
            files["/Component.vue"] = f'''<template>
  <div class="component">
    <!-- {subtask} -->
  </div>
</template>

<script setup>
</script>

<style scoped>
.component {{
  padding: 10px;
}}
</style>
'''
    else:
        # Generic fallback
        files["/index.js"] = f'// Generated for: {subtask}\n'
    
    return {
        "files": files,
        "explanation": f"Stub code for: {subtask}",
    }
