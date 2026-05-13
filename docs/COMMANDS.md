# Command Reference - pi-pipeline

## Slash Commands

### /plan
Start plan mode.

```bash
/plan <goal> [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--depth` | Planning depth |
| `--gates` | Verification gates |

### /verify
Run verification.

```bash
/verify [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--gate` | Specific gate |
| `--fail-fast` | Stop on first failure |

### /clarify
Clarify intent.

```bash
/clarify [topic]
```

### /work
Work item management.

```bash
/work <action> [task] [options]
```

#### Actions

| Action | Description |
|--------|-------------|
| `add` | Add new task |
| `list` | List all tasks |
| `status` | Show status |
| `done` | Mark complete |
| `block` | Block task |
| `unblock` | Unblock task |
| `graph` | Show dependency graph |

## Tools

### plan_create

```javascript
plan_create({
  goal: "Implement authentication",
  depth: "detailed",
  gates: ["tests", "lint", "security"]
})
```

### plan_verify

```javascript
plan_verify({
  gates: ["tests", "lint"],
  failFast: true
})
```

### work_add

```javascript
work_add({
  title: "Task name",
  priority: "high",
  estimate: "1h",
  dependsOn: ["task-1"]
})
```

### work_list

```javascript
work_list({ status: "all" })
```

### work_done

```javascript
work_done({ taskId: "task-123" })
```

### clarify_ask

```javascript
clarify_ask({
  questions: [
    { id: "auth", question: "JWT or session?" }
  ]
})
```

## Workflow Steps

1. **Assess** - Analyze requirements
2. **Plan** - Create task breakdown
3. **Execute** - Implement tasks
4. **Verify** - Run gates
5. **Complete** - Final review
