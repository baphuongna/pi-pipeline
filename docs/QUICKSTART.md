# Quick Start - pi-pipeline

## Installation

```bash
pi install npm:pi-pipeline
```

## Basic Usage

### 1. Start Plan Mode

```bash
/plan Implement user authentication

Output:
## Plan Mode: User Authentication

### Requirements
- User registration with email
- Login with email/password
- JWT token generation
- Logout functionality

### Tasks
1. [ ] Design database schema
2. [ ] Create User model
3. [ ] Implement registration API
4. [ ] Implement login API
5. [ ] Add JWT middleware
6. [ ] Write tests

### Verification Gates
- [ ] All tests pass
- [ ] Security review passed
- [ ] Code quality checks pass
```

### 2. Add Work Items

```bash
/work add "Implement registration API"
/work add "Implement login API"
/work list
```

### 3. Complete Tasks

```bash
/work done "Implement registration API"
/work status
```

### 4. Verify

```bash
/verify

Output:
## Verification Results

### Quality Gates
✅ All tests pass
✅ Lint checks pass
✅ Type checks pass
⚠️ Security review - 2 warnings

### Summary
Status: PARTIAL
Issues: 2 medium severity
```

## Examples

### Example: Clarify Requirements

```
/clarify

Output:
## Intent Clarification

I have some questions:

1. **Authentication Method**
   - Should we use JWT or session-based auth?
   - Token expiry duration?

2. **Password Requirements**
   - Minimum length?
   - Require special characters?

3. **Registration Flow**
   - Email verification required?
   - Welcome email?
```

### Example: Session Planning

```
/plan Sprint 2 features

Output:
## Session Plan

### Session 1
- Task A (estimated: 30min)
- Task B (estimated: 1h)

### Session 2
- Task C (estimated: 45min)
- Task D (estimated: 2h)

### Context for Next Session
Resume from: Task C
```
