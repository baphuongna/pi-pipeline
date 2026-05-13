# pi-pipeline

Pipeline orchestration extension for Pi coding agents.

## Features

- **Plan Mode** - Structured development: SPEC → PLAN → TASKS → VERIFY
- **Verification Gates** - Quality enforcement before completion
- **Intent Clarification** - Ask clarifying questions when needed
- **Adaptive Behavior** - Adjust by task complexity
- **Work Items** - Track work items with status
- **Skill Registry** - Manage and search skills
- **Session Planning** - Plan across sessions
- **Dependency Graph** - Task dependency resolution with cycle detection
- **Event Pipeline** - Async event-driven architecture
- **Spec-Driven Workflow** - Structured development workflow

## Install

```bash
pi install npm:pi-pipeline
```

## Usage

### Start Plan Mode
```bash
/plan Implement user authentication
```

### Verify Completion
```bash
/verify
```

### Clarify Intent
```bash
/clarify
```

### Track Work Items
```bash
/work add Implement login
/work list
/work done Implement login
```

## Commands

- `/plan` - Start plan mode
- `/verify` - Verify completion
- `/clarify` - Clarify requirements
- `/work` - Work item management

## Verify

```bash
pi list
```

## License

MIT