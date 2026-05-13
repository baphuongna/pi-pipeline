# pi-pipeline Agent Operating Guide

## Extension Purpose

pi-pipeline provides task orchestration, milestone tracking, and quality gates for Pi coding agents.

## Source Of Truth

1. `README.md` - Extension overview
2. `docs/HARNESS.md` - Operating model
3. `docs/FEATURE_INTAKE.md` - Intake process
4. `docs/product/` - Product contracts
5. `docs/stories/` - Story packets
6. `docs/TEST_MATRIX.md` - Proof status
7. `docs/decisions/` - Decision records

## Extension Capabilities

### Core Tools
- `pipeline_status` - Get pipeline state
- `pipeline_verify` - Run verification gates
- `pipeline_progress` - Track progress
- `visual_update_plan` - Update plan display
- `visual_update_progress` - Update progress display

### Commands
- `/plan` - Create implementation plan
- `/go` - Execute plan
- `/clarify` - Clarify requirements
- `/verify` - Run verification

## Validation Commands

```bash
npm test
npm run lint
npx tsc --noEmit
```
