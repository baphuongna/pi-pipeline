---
name: spec-driven
description: Spec-driven development with milestones, quality gates, cost tracking, and work item management
triggers:
  - spec-driven
  - milestone
  - pipeline
  - ship
  - deploy
  - quality gate
  - verification
  - work item
  - track progress
  - cost tracking
requirements:
  tools: [pipeline_status, pipeline_verify, read, bash]
  context: [spec files, codebase]
---

# Spec-Driven Skill

## Objective
Track development progress through spec-driven milestones, run verification gates, and manage work items through the pipeline.

## Tools Available
- `pipeline_status` - Get the current pipeline state including plan mode, task progress, and complexity level
- `pipeline_verify` - Run verification gates for the current task

## When to Use
- When working on spec-driven development
- When tracking milestones and deliverables
- When running quality gates before commits
- When managing work items through the pipeline
- When checking verification status

## Tool Usage

### pipeline_status
```javascript
pipeline_status()
```

Returns:
- Plan mode (tiny, normal, high-risk)
- Task progress
- Complexity level
- Quality gate status
- Active work items

### pipeline_verify
```javascript
pipeline_verify({
  testCommand: "npm test",
  changedFiles: ["src/file1.ts", "src/file2.ts"]
})
```

Runs verification gates:
- Tests
- Type checking
- Lint
- Regression checks
- Evidence completeness

## Spec-Driven Workflow

### 1. Create Spec
```markdown
# SPEC: Feature Name

## Goal
What we want to achieve

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Verification
How we'll verify success
```

### 2. Track Progress
```javascript
pipeline_status()
// Check current phase and progress
```

### 3. Run Verification
```javascript
pipeline_verify({
  testCommand: "npm test && npm run lint"
})
```

## Quality Gates

| Gate | Purpose |
|------|---------|
| Tests | Unit and integration tests pass |
| Typecheck | TypeScript types valid |
| Lint | Code style compliant |
| Regression | No breaking changes |
| Evidence | Proof of completion |

## Work Items

Track work through pipeline:
- `TODO` - Work to do
- `IN_PROGRESS` - Currently working
- `REVIEW` - Under review
- `DONE` - Completed

## Examples

### Check Pipeline Status
```
User: What's the current status?
Agent:
  pipeline_status()
```

### Verify Before Commit
```
Agent:
  pipeline_verify({
    testCommand: "npm test",
    changedFiles: ["src/**/*.ts"]
  })
```

### Track Milestone
```
User: Are we on track for the release?
Agent:
  1. pipeline_status()
  2. Check milestones in SPEC.md
```

## Integration

### With pi-audit
```javascript
// Add security gate
pipeline_verify({
  testCommand: "npm test",
  changedFiles: ["src/auth/**"]
})
// Include security review in gates
```

### With pi-debug
```javascript
// Add debug info to work items
pipeline_status()
// Debug stuck work items
```

## Integration with pi-recollect

### Store Quality Gate Results

```typescript
memory_store({
  category: "quality",
  title: "Test coverage below threshold",
  content: `Gate: test-coverage
Threshold: 80%
Current: 65%
Fix: Add tests for src/utils/`,
  metadata: { 
    gate: "test-coverage",
    value: 65
  }
})
```

### Before Running Pipeline

```typescript
memory_search({
  query: "pipeline failed quality gate",
  maxResults: 3
})
```
