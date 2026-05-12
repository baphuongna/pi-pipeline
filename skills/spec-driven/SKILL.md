---
name: spec-driven
description: Spec-driven development with milestones, cost tracking, and quality gates
triggers:
  - spec-driven
  - milestone
  - pipeline
  - ship
  - deploy
requirements:
  tools: [read, write, bash]
  context: [project structure, current branch]
---

# Spec-Driven Pipeline Skill

## Objective
Execute spec-driven development with milestone tracking, cost monitoring, and automated quality gates.

## When to Use
- When starting a new feature from SPEC.md
- When tracking progress through development phases
- When deploying with quality gates and canary monitoring
- When managing pipeline budgets

## Workflow

### Step 1: Create Milestone from Spec
```typescript
import { SpecMilestone, parseSpec } from '../../src/milestone/spec-milestone';

const specContent = await read('SPEC.md');
const milestone = specMilestone.createFromSpec(specContent, budget = 100);

console.log(`Created milestone ${milestone.id}`);
console.log(`Phase: ${milestone.phase}`);
console.log(`Tasks: ${milestone.tasks.length}`);
```

### Step 2: Track Cost
```typescript
import { CostTracker } from '../../src/budget/cost-tracker';

const tracker = new CostTracker();
tracker.setBudget(milestone.id, 100);

// Record costs as you work
tracker.record(milestone.id, 'planning', 'Code review', 5);
tracker.record(milestone.id, 'implementing', 'Feature implementation', 30);

// Check budget
if (tracker.isOverBudget(milestone.id)) {
  console.warn('Over budget!');
}
```

### Step 3: Run Quality Gates
```typescript
import { QualityGates } from '../../src/verify/quality-gates';

const gates = new QualityGates({
  biome: true,
  tsc: true,
  tests: true,
  coverage: 80
});

// Pre-commit (fast)
const preCommit = await gates.run('pre-commit');
console.log(gates.formatReport(preCommit));

// Pre-push (thorough)
const prePush = await gates.run('pre-push');
if (!prePush.passed) {
  throw new Error('Quality gates failed');
}
```

### Step 4: Ship with Canary
```typescript
import { ShipWorkflow } from '../../src/ship/ship-workflow';

const ship = new ShipWorkflow();

// Deploy to staging first
const staging = await ship.ship({
  environment: 'staging',
  verify: { smokeTest: true }
});

// Deploy to production with canary
const production = await ship.ship({
  environment: 'production',
  canary: {
    enabled: true,
    percentage: 10,
    duration: 300000 // 5 minutes
  },
  verify: {
    smokeTest: true,
    healthCheck: '/health'
  }
});
```

## Milestone Phases

| Phase | Description |
|-------|-------------|
| planning | Requirements analysis, design |
| implementing | Code development |
| verifying | Testing, quality checks |
| shipping | Deployment, monitoring |
| done | Complete |
| blocked | Waiting on resolution |

## Quality Gate Levels

### Pre-commit (Fast)
- Biome formatting check
- TypeScript type check
- ~10 seconds

### Pre-push (Thorough)
- All pre-commit checks
- Test suite execution
- Coverage threshold check
- ~2-5 minutes

## Canary Deployment

Monitor canary deployment for:
- Success rate (target: >95%)
- Latency (target: <200ms)
- Error rate (target: <5%)

Rollback automatically if metrics degrade.

## Examples

### Full Pipeline
```
User: Ship this feature following the spec
Agent:
  1. Create milestone from SPEC.md
  2. Track costs through planning
  3. Run pre-commit gates
  4. Implement feature
  5. Run pre-push gates
  6. Deploy with canary
  7. Monitor and report
```

### Budget Alert
```
Agent:
  tracker.record(milestone.id, 'implementing', 'Big feature', 45);
  
  const alert = tracker.getAlert(milestone.id);
  if (alert?.triggered) {
    console.log(`⚠️ 80% budget used: ${alert.current}/${alert.limit}`);
  }
```

### Queue Deployments
```
Agent:
  ship.queue({ environment: 'staging' });
  ship.queue({ environment: 'production' });
  
  // Process in order
  const results = await ship.processQueue();
```

## Integration

### With pi-recollect
```typescript
// Remember key decisions
await memory.remember(
  'Architecture choice',
  'Microservices over monolith',
  'decision'
);

// Add to milestone context
const context = smartContext.query({ query: 'architecture' });
```

### With pi-smart
```typescript
// Use smart context for decisions
const decisions = smartContext.decisions();

// Index code for fast lookup
await codeIndex.indexProject(cwd);
```
