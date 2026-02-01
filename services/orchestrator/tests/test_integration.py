"""Integration tests for workflow components.

Note: Full end-to-end workflow tests are limited due to a known issue with
the LangGraph Send API in the assign_coders_node. These tests verify the
individual components work correctly together.

The workflow has a bug where assign_coders_node is used both as a node
and as a conditional edge function, which LangGraph doesn't support.
This is tracked as a known issue.
"""
import pytest
from unittest.mock import patch, MagicMock
from graph.workflow import (
    AgentState,
    CoderState,
    create_initial_state,
    planner_node,
    assign_coders_node,
    coder_node,
    reviewer_node,
    coder_revision_node,
    merge_dicts,
)


@pytest.fixture
def mock_llm_responses():
    """Mock LLM responses for all agents."""
    return {
        'planner': {
            'subtasks': [
                'Create App component with state',
                'Create TodoList component',
                'Create TodoItem component',
                'Add styling'
            ],
            'reasoning': 'Breaking down todo app into components'
        },
        'coder': {
            'files': {
                '/App.jsx': 'export default function App() { return <div>Todo App</div>; }',
                '/TodoList.jsx': 'export default function TodoList() { return <ul></ul>; }',
                '/TodoItem.jsx': 'export default function TodoItem() { return <li></li>; }',
                '/styles.css': 'body { margin: 0; }'
            },
            'explanation': 'Generated React components for todo app'
        },
        'reviewer': {
            'approved': True,
            'score': 9,
            'feedback': 'Code looks good, well structured',
            'issues': [],
            'suggestions': ['Consider adding PropTypes']
        }
    }


def test_full_workflow_nodes_integration(mock_llm_responses):
    """Test complete workflow by calling nodes in sequence."""
    with patch('graph.workflow.plan_task') as mock_planner, \
         patch('graph.workflow.generate_code') as mock_coder, \
         patch('graph.workflow.review_code') as mock_reviewer:
        
        # Setup mocks
        mock_planner.return_value = mock_llm_responses['planner']
        mock_coder.return_value = mock_llm_responses['coder']
        mock_reviewer.return_value = mock_llm_responses['reviewer']
        
        # Step 1: Create initial state
        state = create_initial_state(
            'Create a todo app with add/remove functionality',
            'react'
        )
        assert state['status'] == 'started'
        assert state['plan'] == []
        
        # Step 2: Run planner
        planner_result = planner_node(state)
        assert planner_result.goto == 'assign_coders'
        assert len(planner_result.update['plan']) == 4
        
        # Update state with planner result
        state = {**state, **planner_result.update}
        assert state['status'] == 'planning_complete'
        
        # Step 3: Run assign_coders (creates Send objects)
        sends = assign_coders_node(state)
        assert len(sends) == 4
        for send in sends:
            assert send.node == 'coder'
            assert 'subtask' in send.arg
            assert send.arg['framework'] == 'react'
        
        # Step 4: Run coder for each subtask (simulating parallel execution)
        all_files = {}
        for send in sends:
            coder_result = coder_node(send.arg)
            all_files = merge_dicts(all_files, coder_result.get('files', {}))
        
        assert len(all_files) > 0
        state['files'] = all_files
        
        # Step 5: Run reviewer
        reviewer_result = reviewer_node(state)
        assert reviewer_result.goto == '__end__'
        assert reviewer_result.update['status'] == 'completed'
        
        # Verify final state
        state = {**state, **reviewer_result.update}
        assert state['status'] == 'completed'
        assert len(state['files']) > 0
        
        # Verify all agents were called
        mock_planner.assert_called_once()
        assert mock_coder.call_count == 4  # Once per subtask
        mock_reviewer.assert_called_once()


def test_workflow_with_revision_integration(mock_llm_responses):
    """Test workflow with reviewer requesting revisions."""
    with patch('graph.workflow.plan_task') as mock_planner, \
         patch('graph.workflow.generate_code') as mock_coder, \
         patch('graph.workflow.review_code') as mock_reviewer:
        
        # Setup mocks
        mock_planner.return_value = {'subtasks': ['Create component']}
        mock_coder.return_value = mock_llm_responses['coder']
        
        # First review: needs fixes
        first_review = {
            'approved': False,
            'score': 6,
            'feedback': 'Missing error handling',
            'issues': ['No error boundaries'],
            'suggestions': ['Add error handling']
        }
        # Second review: approved
        second_review = mock_llm_responses['reviewer']
        mock_reviewer.side_effect = [first_review, second_review]
        
        # Initial state
        state = create_initial_state('Create a counter app', 'react')
        
        # Run planner
        planner_result = planner_node(state)
        state = {**state, **planner_result.update}
        
        # Run coder
        sends = assign_coders_node(state)
        for send in sends:
            coder_result = coder_node(send.arg)
            state['files'] = merge_dicts(state.get('files', {}), coder_result.get('files', {}))
        
        # First review - should request revision
        reviewer_result = reviewer_node(state)
        assert reviewer_result.goto == 'coder'
        assert reviewer_result.update['status'] == 'needs_revision'
        assert reviewer_result.update['iteration'] == 1
        
        state = {**state, **reviewer_result.update}
        
        # Run revision coder
        revision_result = coder_revision_node(state)
        state['files'] = merge_dicts(state.get('files', {}), revision_result.get('files', {}))
        state['current_agent'] = revision_result.get('current_agent', state['current_agent'])
        state['status'] = revision_result.get('status', state['status'])
        
        # Second review - should approve
        reviewer_result = reviewer_node(state)
        assert reviewer_result.goto == '__end__'
        assert reviewer_result.update['status'] == 'completed'
        
        # Verify reviewer was called twice
        assert mock_reviewer.call_count == 2


def test_workflow_max_iterations_integration():
    """Test workflow stops after max iterations."""
    with patch('graph.workflow.plan_task') as mock_planner, \
         patch('graph.workflow.generate_code') as mock_coder, \
         patch('graph.workflow.review_code') as mock_reviewer:
        
        # Setup mocks - reviewer always rejects
        mock_planner.return_value = {'subtasks': ['Create component']}
        mock_coder.return_value = {'files': {'/App.jsx': 'code'}}
        mock_reviewer.return_value = {
            'approved': False,
            'score': 5,
            'feedback': 'Needs improvement',
            'issues': ['Issue 1'],
            'suggestions': []
        }
        
        # Initial state
        state = create_initial_state('Create app', 'react')
        
        # Run planner
        planner_result = planner_node(state)
        state = {**state, **planner_result.update}
        
        # Run initial coder
        sends = assign_coders_node(state)
        for send in sends:
            coder_result = coder_node(send.arg)
            state['files'] = merge_dicts(state.get('files', {}), coder_result.get('files', {}))
        
        # Simulate revision loop until max iterations
        for i in range(4):  # Max is 3, so 4 iterations should hit the limit
            reviewer_result = reviewer_node(state)
            state = {**state, **reviewer_result.update}
            
            if reviewer_result.goto == '__end__':
                break
            
            # Run revision coder
            revision_result = coder_revision_node(state)
            state['files'] = merge_dicts(state.get('files', {}), revision_result.get('files', {}))
        
        # Should complete with issues after max iterations
        assert state['status'] == 'completed_with_issues'
        assert state['iteration'] >= 3


def test_workflow_state_persistence_integration():
    """Test that workflow state is properly maintained through nodes."""
    with patch('graph.workflow.plan_task') as mock_planner, \
         patch('graph.workflow.generate_code') as mock_coder, \
         patch('graph.workflow.review_code') as mock_reviewer:
        
        # Setup mocks
        mock_planner.return_value = {'subtasks': ['Task 1', 'Task 2']}
        mock_coder.return_value = {'files': {'/file.js': 'content'}}
        mock_reviewer.return_value = {
            'approved': True,
            'score': 10,
            'feedback': 'Perfect',
            'issues': [],
            'suggestions': []
        }
        
        # Initial state with specific values
        state = create_initial_state('Test task', 'react')
        original_workflow_id = state['workflow_id']
        
        # Run through workflow
        planner_result = planner_node(state)
        state = {**state, **planner_result.update}
        
        sends = assign_coders_node(state)
        for send in sends:
            coder_result = coder_node(send.arg)
            state['files'] = merge_dicts(state.get('files', {}), coder_result.get('files', {}))
        
        reviewer_result = reviewer_node(state)
        state = {**state, **reviewer_result.update}
        
        # Verify state fields are preserved
        assert state['workflow_id'] == original_workflow_id
        assert state['task'] == 'Test task'
        assert state['framework'] == 'react'
        assert isinstance(state['plan'], list)
        assert len(state['plan']) == 2
        assert isinstance(state['files'], dict)
        assert len(state['files']) > 0
        assert state['status'] == 'completed'


def test_coder_context_includes_existing_files():
    """Test that coder receives existing files in context."""
    with patch('graph.workflow.generate_code') as mock_coder:
        mock_coder.return_value = {'files': {'/new.js': 'new content'}}
        
        state: AgentState = {
            'workflow_id': 'test-123',
            'task': 'Add feature',
            'framework': 'react',
            'plan': ['Add new component'],
            'files': {'/existing.js': 'existing content'},
            'review_feedback': 'Fix the bug',
            'iteration': 1,
            'status': 'needs_revision',
            'current_agent': 'reviewer',
            'error': None,
        }
        
        sends = assign_coders_node(state)
        
        # Verify context includes existing files and review feedback
        assert len(sends) == 1
        context = sends[0].arg['context']
        assert context['existing_files'] == {'/existing.js': 'existing content'}
        assert context['review_feedback'] == 'Fix the bug'


def test_merge_dicts_handles_parallel_coder_output():
    """Test that merge_dicts correctly combines files from parallel coders."""
    # Simulate parallel coder outputs
    coder1_files = {'/App.jsx': 'app code', '/utils.js': 'utils code'}
    coder2_files = {'/Header.jsx': 'header code'}
    coder3_files = {'/Footer.jsx': 'footer code', '/styles.css': 'styles'}
    
    # Merge sequentially (as reducer would)
    result = merge_dicts(None, coder1_files)
    result = merge_dicts(result, coder2_files)
    result = merge_dicts(result, coder3_files)
    
    # All files should be present
    assert len(result) == 5
    assert '/App.jsx' in result
    assert '/Header.jsx' in result
    assert '/Footer.jsx' in result
    assert '/utils.js' in result
    assert '/styles.css' in result


def test_reviewer_feedback_passed_to_revision_coder():
    """Test that review feedback is passed to revision coder."""
    with patch('graph.workflow.generate_code') as mock_coder:
        mock_coder.return_value = {'files': {'/App.jsx': 'fixed code'}}
        
        state: AgentState = {
            'workflow_id': 'test-123',
            'task': 'Create app',
            'framework': 'react',
            'plan': ['Create component'],
            'files': {'/App.jsx': 'buggy code'},
            'review_feedback': 'Fix the null pointer exception',
            'iteration': 1,
            'status': 'needs_revision',
            'current_agent': 'reviewer',
            'error': None,
        }
        
        coder_revision_node(state)
        
        # Verify generate_code was called with review feedback in context
        call_args = mock_coder.call_args
        assert call_args[1]['context']['review_feedback'] == 'Fix the null pointer exception'
        assert call_args[1]['context']['existing_files'] == {'/App.jsx': 'buggy code'}
