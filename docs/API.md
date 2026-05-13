# pi-pipeline API Reference

## SDLC Router

```typescript
import { routeSDLC, getPathDescription, estimateTime } from 'pi-pipeline';

const result = routeSDLC({
  hasBAInput: true,
  complexity: 'high',
  urgency: 'medium',
  hasAmbiguity: false,
  requiresConsensus: false,
});

console.log(result.path);    // 'a' | 'b' | 'c'
console.log(result.reason);  // Explanation
console.log(result.steps);   // Implementation steps

// Get path description
getPathDescription('a'); // "BA Pipeline (Full)"
getPathDescription('b'); // "Quick Spec"
getPathDescription('c'); // "Consensus Plan"

// Estimate time
estimateTime('a', 'high'); // "2-4 hours"
```

## ADR Registry

```typescript
import {
  createDecisionRegistry,
  createADR,
  formatDecisionAsMarkdown,
} from 'pi-pipeline';

const registry = createDecisionRegistry();

// Create ADR
const adr = createADR({
  id: 'ADR-001',
  title: 'Use Graph Memory',
  deciders: ['Team'],
  context: 'We need better memory',
  decision: 'Use hash-based graph',
  positive: ['Better search', 'No conflicts'],
  negative: ['Initial setup'],
});

// Add to registry
registry.add(adr);

// Get as markdown
const markdown = formatDecisionAsMarkdown(adr);
```

## Boil the Lake

```typescript
import { shouldComplete, formatCompressionRatio } from 'pi-pipeline';

// Should use complete approach?
const result = shouldComplete(95, 150, 80, 50);
// { complete: true, reason: '...' }

// Get compression ratio
formatCompressionRatio('boilerplate');
// "~100x compression (48h human / 15min AI)"
```

## Quality Gates

```typescript
import { runQualityGates } from 'pi-pipeline';

const gates = runQualityGates({
  coverage: 90,
  lint: true,
  tests: true,
});

if (gates.passed) {
  console.log('Ready to ship!');
}
```

## Metric Registry

```typescript
import { createMetricRegistry } from 'pi-pipeline';

const registry = createMetricRegistry();

// Create metrics
registry.counter('requests_total');
registry.gauge('active_users', 100);
registry.histogram('request_duration', [0.1, 0.5, 1, 5]);

// Record values
registry.get('requests_total').increment();
registry.get('request_duration').record(0.35);
```
