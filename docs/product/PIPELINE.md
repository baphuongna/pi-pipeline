# Pipeline Contracts

## Quality Gates

| Gate | Command |
| --- | --- |
| Tests | npm test |
| Typecheck | npx tsc --noEmit |
| Lint | npm run lint |
| Regression | manual check |

## Pipeline States

| State | Meaning |
| --- | --- |
| DRAFT | Plan being created |
| READY | Plan ready for review |
| APPROVED | Approved for execution |
| REJECTED | Rejected, needs revision |
