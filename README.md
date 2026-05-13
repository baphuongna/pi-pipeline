# pi-pipeline

Pipeline orchestration and workflow automation for coding agents.

## Features

- **Spec-Driven Milestones** - Structured development workflow
- **Quality Gates** - Automated quality checkpoints
- **Metric Registry** - Counter, Gauge, Histogram metrics
- **Model Fallback** - Multi-model routing with fallback
- **Progress Coalescer** - Event batching for efficiency
- **Dependency Context** - Result aggregation across tasks
- **SDLC Router** - Workflow path selection (BA/Quick/Consensus)
- **ADR Registry** - Architecture decision records

## Installation

```bash
npm install pi-pipeline
```

## Usage

### Commands

- `/plan [task]` - Create implementation plan
- `/ship` - Ship to production
- `/gates` - Run quality gates
- `/metrics` - Show pipeline metrics
- `/adr [id]` - Show architecture decision

### SDLC Router

```typescript
import { routeSDLC } from 'pi-pipeline';

const recommendation = routeSDLC({
  hasBAInput: true,
  complexity: 'high',
  urgency: 'medium',
  hasAmbiguity: false,
  requiresConsensus: false,
});

// Path A: BA Pipeline (Full)
// Path B: Quick Spec
// Path C: Consensus Plan
```

## Architecture

```
src/
├── milestone/
│   └── spec-milestone.ts    # Spec-driven milestones
├── verify/
│   ├── gates.ts            # Quality gates
│   └── quality-gates.ts    # Quality checkpoints
├── metrics/
│   └── metric-registry.ts  # Metrics collection
├── router/
│   └── sdlc-router.ts      # Workflow routing
├── decisions/
│   └── adr.ts              # ADR registry
├── ethos/
│   └── boil-the-lake.ts    # Completeness ethos
└── index.ts
```

## Patterns Applied

- Spec-driven milestones from gsd-2
- Quality gates from everything-claude-code
- MetricRegistry from pi-crew
- ModelFallback from pi-crew
- BoilTheLake from gstack
- ADR from gsd-2

## License

MIT
