# User Guide - pi-pipeline

## Overview

pi-pipeline provides structured development workflow orchestration for Pi coding agents.

## Plan Mode

### How It Works

1. **SPEC** - Define specifications
2. **PLAN** - Create implementation plan
3. **TASKS** - Track tasks
4. **VERIFY** - Quality gates

### Workflow

```bash
/plan <goal>
```

Creates:
- Requirements list
- Task breakdown
- Dependencies
- Verification gates

## Work Items

### Task Lifecycle

```
add → in-progress → done
         ↓
      blocked
         ↓
      unblocked → done
```

### Commands

```bash
/work add "Task description"
/work list
/work status
/work done "Task name"
/work block "Task name" --reason="Waiting on API"
/work unblock "Task name"
```

### Task Structure

```javascript
{
  id: "task-123",
  title: "Implement login API",
  status: "in-progress",
  priority: "high",
  estimate: "1h",
  dependsOn: ["task-122"],
  tags: ["backend", "auth"]
}
```

## Verification Gates

### Types

| Gate | Check |
|------|-------|
| `tests` | All tests pass |
| `lint` | Lint checks pass |
| `types` | Type checks pass |
| `security` | Security scan pass |
| `coverage` | Coverage threshold |
| `review` | Code review approved |

### Configuration

```yaml
gates:
  - name: tests
    command: npm test
    failOn: non-zero
  
  - name: lint
    command: npm run lint
    failOn: warnings
  
  - name: coverage
    threshold: 80
```

## Intent Clarification

### When Triggered

- Ambiguous requirements
- Missing context
- Conflicting specs
- Technology choices

### Process

1. Agent identifies ambiguity
2. Generates questions
3. User provides answers
4. Updates plan

### Custom Questions

```yaml
clarify:
  questions:
    - id: auth-type
      question: "JWT or session-based auth?"
      options: ["JWT", "session", "oauth"]
      required: true
```

## Adaptive Behavior

### Complexity Levels

| Level | Trigger | Behavior |
|-------|---------|----------|
| Simple | < 5 files | Minimal planning |
| Medium | 5-20 files | Standard workflow |
| Complex | > 20 files | Deep planning |
| Massive | > 100 files | Multi-session |

### Adaptation

```javascript
{
  "planMode": {
    "simple": { "depth": "minimal", "gates": ["tests"] },
    "medium": { "depth": "standard", "gates": ["tests", "lint"] },
    "complex": { "depth": "detailed", "gates": ["tests", "lint", "types", "security"] }
  }
}
```

## Dependency Graph

### Task Dependencies

```bash
# Add dependency
/work add "Task C" --depends="Task A,Task B"

/# Show graph
/work graph
```

### Cycle Detection

Automatically detects circular dependencies:

```
Error: Circular dependency detected
A → B → C → A
```

## Session Planning

### Cross-Session Continuity

```bash
/plan large-feature

Output:
## Session Plan

### Session 1 (Today)
- Part 1 of feature

### Session 2 (Next)
- Part 2 of feature

### Handoff Notes
Remember: user prefers JWT tokens...
```

### Context Saving

Saves state for next session:
- Current task
- Progress
- Decisions made
- Open questions
