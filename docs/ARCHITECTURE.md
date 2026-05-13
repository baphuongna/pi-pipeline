# Architecture

## Structure

```
pi-pipeline/
├── src/
│   ├── commands/         # Pipeline commands
│   ├── verify/           # Quality gates
│   ├── budget/           # Cost tracking
│   └── milestone/        # Milestone tracking
├── skills/
└── test/unit/
```

## Core Components

| Component | Purpose |
| --- | --- |
| Plan | Create implementation plans |
| Verify | Run quality gates |
| Budget | Track cost and progress |
| Milestone | Track milestones |
