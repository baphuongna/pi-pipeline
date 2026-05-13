# Quick Start - pi-pipeline

## Installation

```bash
pi install npm:pi-pipeline
```

## Basic Usage

### Create Plan

```bash
/plan Implement user authentication
```

### Ship Feature

```bash
/ship
```

### Run Quality Gates

```bash
/gates
```

### Show Metrics

```bash
/metrics
```

## SDLC Router

```typescript
import { routeSDLC } from 'pi-pipeline';

// Route to appropriate workflow
const path = routeSDLC({
  hasBAInput: true,
  complexity: 'high',
  urgency: 'low',
  hasAmbiguity: false,
  requiresConsensus: false,
});

console.log(path.path);    // 'a' | 'b' | 'c'
console.log(path.steps);   // Implementation steps
```

## Architecture Decisions

```typescript
import { createDecisionRegistry, createADR } from 'pi-pipeline';

const registry = createDecisionRegistry();

registry.add(createADR({
  id: 'ADR-001',
  title: 'Use Graph Memory',
  deciders: ['Team Lead'],
  context: 'Need better context',
  decision: 'Use hash-based graph',
}));

// List all ADRs
registry.list();
```

## Boil the Lake

```typescript
import { shouldComplete } from 'pi-pipeline';

// Decide: complete approach vs shortcut?
const result = shouldComplete(
  95,   // coverage A
  150,  // lines A
  80,   // coverage B
  50    // lines B
);

if (result.complete) {
  console.log('Do the complete thing!');
}
```

## Next Steps

- Read [API.md](API.md) for full API reference
- Check [SPEC.md](../SPEC.md) for feature details
