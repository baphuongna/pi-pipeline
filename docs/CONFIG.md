# Configuration - pi-pipeline

## Configuration File

Create `pi-pipeline.config.json`:

```json
{
  "workflow": {
    "defaultDepth": "standard",
    "adaptiveBehavior": true,
    "autoClarify": true
  },
  "gates": {
    "enabled": true,
    "default": ["tests", "lint"],
    "critical": ["tests", "lint", "types", "security"],
    "minimal": ["tests"]
  },
  "workItems": {
    "storage": ".pi/work-items.json",
    "syncToRemote": false
  },
  "clarify": {
    "autoTrigger": true,
    "minAmbiguity": 0.7,
    "questions": []
  },
  "session": {
    "saveContext": true,
    "handoffNotes": true,
    "planAhead": true
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PI_PIPELINE_DEPTH` | Default depth | standard |
| `PI_PIPELINE_GATES` | Default gates | tests,lint |

## Depth Levels

```json
{
  "depth": {
    "minimal": {
      "tasks": 3,
      "gates": ["tests"]
    },
    "standard": {
      "tasks": 10,
      "gates": ["tests", "lint"]
    },
    "detailed": {
      "tasks": 50,
      "gates": ["tests", "lint", "types", "security", "coverage"]
    }
  }
}
```

## Custom Gates

```json
{
  "gates": {
    "myGate": {
      "command": "npm run custom-check",
      "failOn": "non-zero",
      "timeout": 300000
    }
  }
}
```
