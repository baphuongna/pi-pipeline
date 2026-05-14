# pi-pipeline Agent Operating Guide

## Extension Purpose

pi-pipeline provides spec-driven development, milestone tracking, and quality gates for Pi coding agents.

## Source Of Truth

1. `README.md` - Extension overview
2. `skills/spec-driven/SKILL.md` - Pipeline skill
3. `docs/HARNESS.md` - Operating model
4. `docs/FEATURE_INTAKE.md` - Intake process
5. `docs/product/` - Product contracts
6. `docs/stories/` - Story packets
7. `docs/TEST_MATRIX.md` - Proof status
8. `docs/decisions/` - Decision records

## Extension Capabilities

### Core Tools
- `pipeline_status` - Get pipeline state
- `pipeline_verify` - Run verification gates

### Skills
- `skills/spec-driven/SKILL.md` - Milestones, quality gates, work items

## When to Use This Extension

- Spec-driven development
- Milestone tracking
- Quality gate verification
- Work item management

## Validation Commands

```bash
npm test
npm run lint
npx tsc --noEmit
```
