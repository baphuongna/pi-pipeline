# US-001: Pipeline Tool

## User Story
As an agent, I want to track tasks, run verification gates, and manage milestones so that I can deliver high-quality code through the development pipeline.

## Status
- [x] Implemented

## Tools
- `pipeline_status` - Get pipeline state
- `pipeline_verify` - Run verification gates

## Features
- Quality gates
- Work item tracking
- Milestone management
- Cost tracking
- Concurrency control

## Triggers
- "spec-driven", "milestone", "pipeline", "ship", "deploy"

## Acceptance Criteria
- [x] Pipeline status shows current state
- [x] Verification gates can be run
- [x] Work items are tracked

## Notes
See `skills/spec-driven/SKILL.md` for detailed usage.
