/**
 * Spec-Driven Milestone Tracker
 * Based on gsd-2 headless mode and spec-driven development patterns
 */

export interface Spec {
  title: string;
  problem?: string;
  solution?: string;
  features: string[];
  technical?: {
    stack?: string[];
    apis?: string[];
    dataModel?: string;
  };
  successCriteria: string[];
}

export type MilestonePhase = 
  | 'planning'
  | 'implementing'
  | 'verifying'
  | 'shipping'
  | 'done'
  | 'blocked';

export interface MilestoneTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  phase: MilestonePhase;
  dependencies: string[];
}

export interface Milestone {
  id: string;
  spec: Spec;
  phase: MilestonePhase;
  tasks: MilestoneTask[];
  progress: number;
  createdAt: number;
  updatedAt: number;
  cost: number;
  budget: number;
  blockers: string[];
}

export interface MilestoneResult {
  milestone: Milestone;
  success: boolean;
  output?: string;
  blockers?: string[];
}

function generateId(): string {
  return `ms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Parse SPEC.md content into structured Spec
 */
export function parseSpec(content: string): Spec {
  const lines = content.split('\n');
  const spec: Partial<Spec> = {
    features: [],
    successCriteria: [],
  };

  let currentSection = '';
  let inFeatures = false;
  let inCriteria = false;
  let inTechnical = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers
    if (trimmed.startsWith('# ')) {
      spec.title = trimmed.slice(2).trim();
    } else if (trimmed.startsWith('## ')) {
      currentSection = trimmed.slice(3).toLowerCase();
      inFeatures = currentSection === 'features';
      inCriteria = currentSection === 'success criteria';
      inTechnical = currentSection === 'technical';
    }

    // Content
    if (inFeatures && trimmed.startsWith('- ')) {
      spec.features!.push(trimmed.slice(2));
    } else if (inCriteria && trimmed.startsWith('- [ ] ')) {
      spec.successCriteria!.push(trimmed.slice(6));
    } else if (inCriteria && trimmed.startsWith('- [x] ')) {
      // Already completed criterion
      spec.successCriteria!.push(trimmed.slice(6) + ' (done)');
    } else if (trimmed.startsWith('- ')) {
      if (inFeatures) {
        spec.features!.push(trimmed.slice(2));
      } else if (currentSection === 'problem') {
        spec.problem = (spec.problem || '') + trimmed.slice(2) + '\n';
      } else if (currentSection === 'solution') {
        spec.solution = (spec.solution || '') + trimmed.slice(2) + '\n';
      }
    }
  }

  return spec as Spec;
}

/**
 * Create tasks from spec features
 */
function createTasks(spec: Spec, phase: MilestonePhase): MilestoneTask[] {
  return spec.features.map((feature, index) => ({
    id: `task-${index}`,
    description: feature,
    status: 'pending' as const,
    phase,
    dependencies: index > 0 ? [`task-${index - 1}`] : [],
  }));
}

/**
 * Spec-Driven Milestone Manager
 */
export class SpecMilestone {
  private milestones: Map<string, Milestone> = new Map();
  private costPerPhase: Record<MilestonePhase, number> = {
    planning: 10,
    implementing: 50,
    verifying: 20,
    shipping: 10,
    done: 0,
    blocked: 0,
  };

  /**
   * Create a new milestone from spec content
   */
  createFromSpec(specContent: string, budget = 100): Milestone {
    const spec = parseSpec(specContent);
    const id = generateId();

    const milestone: Milestone = {
      id,
      spec,
      phase: 'planning',
      tasks: createTasks(spec, 'planning'),
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cost: 0,
      budget,
      blockers: [],
    };

    this.milestones.set(id, milestone);
    return milestone;
  }

  /**
   * Get milestone by ID
   */
  get(id: string): Milestone | undefined {
    return this.milestones.get(id);
  }

  /**
   * Advance milestone to next phase
   */
  advance(id: string): MilestoneResult {
    const milestone = this.milestones.get(id);
    if (!milestone) {
      return {
        milestone: { id, spec: { title: '', features: [], successCriteria: [] }, phase: 'planning', tasks: [], progress: 0, createdAt: 0, updatedAt: 0, cost: 0, budget: 0, blockers: [] },
        success: false,
        output: 'Milestone not found',
      };
    }

    const phases: MilestonePhase[] = ['planning', 'implementing', 'verifying', 'shipping', 'done'];
    const currentIndex = phases.indexOf(milestone.phase);

    if (currentIndex === -1 || currentIndex >= phases.length - 1) {
      return {
        milestone,
        success: false,
        output: 'Milestone already completed or in invalid state',
      };
    }

    // Check blockers before advancing
    if (milestone.blockers.length > 0) {
      return {
        milestone,
        success: false,
        blockers: milestone.blockers,
        output: 'Cannot advance with blockers',
      };
    }

    const nextPhase = phases[currentIndex + 1];
    milestone.phase = nextPhase;
    milestone.updatedAt = Date.now();

    // Update tasks for new phase
    if (nextPhase !== 'done') {
      milestone.tasks = createTasks(milestone.spec, nextPhase);
    }

    // Track cost
    milestone.cost += this.costPerPhase[nextPhase];

    // Check budget
    if (milestone.cost > milestone.budget) {
      milestone.blockers.push(`Budget exceeded: ${milestone.cost} > ${milestone.budget}`);
    }

    // Update progress
    milestone.progress = ((currentIndex + 1) / (phases.length - 1)) * 100;

    return {
      milestone,
      success: true,
      output: `Advanced to ${nextPhase} phase`,
    };
  }

  /**
   * Add a blocker
   */
  addBlocker(id: string, blocker: string): void {
    const milestone = this.milestones.get(id);
    if (milestone) {
      milestone.blockers.push(blocker);
      milestone.phase = 'blocked';
      milestone.updatedAt = Date.now();
    }
  }

  /**
   * Resolve a blocker
   */
  resolveBlocker(id: string, blocker: string): void {
    const milestone = this.milestones.get(id);
    if (milestone) {
      milestone.blockers = milestone.blockers.filter((b) => b !== blocker);
      if (milestone.blockers.length === 0 && milestone.phase === 'blocked') {
        // Resume to last valid phase
        milestone.phase = 'implementing';
      }
      milestone.updatedAt = Date.now();
    }
  }

  /**
   * Update task status
   */
  updateTask(milestoneId: string, taskId: string, status: MilestoneTask['status']): void {
    const milestone = this.milestones.get(milestoneId);
    const task = milestone?.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      milestone.updatedAt = Date.now();

      // Check if all tasks are done
      if (milestone.tasks.every((t) => t.status === 'done')) {
        this.advance(milestoneId);
      }
    }
  }

  /**
   * Get all milestones
   */
  getAll(): Milestone[] {
    return [...this.milestones.values()];
  }

  /**
   * Get milestones by phase
   */
  getByPhase(phase: MilestonePhase): Milestone[] {
    return this.getAll().filter((m) => m.phase === phase);
  }

  /**
   * Get cost summary
   */
  getCostSummary(): { total: number; byPhase: Record<MilestonePhase, number> } {
    const byPhase: Record<MilestonePhase, number> = {
      planning: 0,
      implementing: 0,
      verifying: 0,
      shipping: 0,
      done: 0,
      blocked: 0,
    };

    let total = 0;
    for (const milestone of this.milestones.values()) {
      total += milestone.cost;
      byPhase[milestone.phase] += milestone.cost;
    }

    return { total, byPhase };
  }
}
