/**
 * Spec-Driven Workflow - pi-pipeline
 * 
 * Structured development workflow: SPEC → PLAN → TASKS.
 * Ported from spec-kit.git
 */


import { randomUUID } from 'node:crypto';
export interface SpecDocument {
  feature: string;
  overview: string;
  requirements: string[];
  userScenarios: string[];
  successCriteria: string[];
  created: number;
  updated: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  estimate?: string;
  assignee?: string;
}

export interface SpecWorkflow {
  spec: SpecDocument | null;
  plan: string[];
  tasks: Task[];
}

/**
 * Creates spec-driven workflow manager
 */
export function createSpecWorkflow() {
  const workflow: SpecWorkflow = {
    spec: null,
    plan: [],
    tasks: []
  };
  
  function generateId(): string {
    return `T-${randomUUID()}`;
  }
  
  return {
    /**
     * Create spec document
     */
    createSpec(input: {
      feature: string;
      overview: string;
      requirements?: string[];
      userScenarios?: string[];
      successCriteria?: string[];
    }): SpecDocument {
      const now = Date.now();
      workflow.spec = {
        feature: input.feature,
        overview: input.overview,
        requirements: input.requirements || [],
        userScenarios: input.userScenarios || [],
        successCriteria: input.successCriteria || [],
        created: now,
        updated: now
      };
      return workflow.spec;
    },
    
    /**
     * Add plan steps
     */
    setPlan(steps: string[]): void {
      workflow.plan = steps;
    },
    
    /**
     * Add tasks
     */
    addTask(title: string, options: Partial<Task> = {}): Task {
      const task: Task = {
        id: generateId(),
        title,
        description: options.description,
        status: options.status || 'pending',
        priority: options.priority,
        estimate: options.estimate,
        assignee: options.assignee
      };
      workflow.tasks.push(task);
      return task;
    },
    
    /**
     * Update task status
     */
    updateTask(id: string, updates: Partial<Task>): Task | undefined {
      const task = workflow.tasks.find(t => t.id === id);
      if (task) {
        Object.assign(task, updates);
      }
      return task;
    },
    
    /**
     * Complete task
     */
    completeTask(id: string): Task | undefined {
      return this.updateTask(id, { status: 'done' });
    },
    
    /**
     * Get pending tasks
     */
    getPending(): Task[] {
      return workflow.tasks.filter(t => t.status !== 'done');
    },
    
    /**
     * Get progress
     */
    getProgress(): { total: number; done: number; percent: number } {
      const total = workflow.tasks.length;
      const done = workflow.tasks.filter(t => t.status === 'done').length;
      return {
        total,
        done,
        percent: total > 0 ? Math.round((done / total) * 100) : 0
      };
    },
    
    /**
     * Generate SPEC.md
     */
    generateSpecMd(): string {
      if (!workflow.spec) return '';
      
      const lines = ['# Specification\n'];
      lines.push(`\n## Feature: ${workflow.spec.feature}\n`);
      lines.push(`\n## Overview\n${workflow.spec.overview}\n`);
      
      if (workflow.spec.requirements.length > 0) {
        lines.push('\n## Requirements\n');
        for (const req of workflow.spec.requirements) {
          lines.push(`- ${req}`);
        }
      }
      
      if (workflow.spec.userScenarios.length > 0) {
        lines.push('\n## User Scenarios\n');
        for (const scenario of workflow.spec.userScenarios) {
          lines.push(`- ${scenario}`);
        }
      }
      
      if (workflow.spec.successCriteria.length > 0) {
        lines.push('\n## Success Criteria\n');
        for (const criteria of workflow.spec.successCriteria) {
          lines.push(`- [ ] ${criteria}`);
        }
      }
      
      return lines.join('\n');
    },
    
    /**
     * Generate TASKS.md
     */
    generateTasksMd(): string {
      const lines = ['# Tasks\n'];
      const progress = this.getProgress();
      lines.push(`\nProgress: ${progress.done}/${progress.total} (${progress.percent}%)\n`);
      
      const byStatus = {
        'in-progress': workflow.tasks.filter(t => t.status === 'in-progress'),
        'pending': workflow.tasks.filter(t => t.status === 'pending'),
        'done': workflow.tasks.filter(t => t.status === 'done')
      };
      
      for (const [status, tasks] of Object.entries(byStatus)) {
        if (tasks.length === 0) continue;
        lines.push(`\n## ${status.replace('-', ' ').toUpperCase()}\n`);
        for (const task of tasks) {
          const checkbox = task.status === 'done' ? '[x]' : '[ ]';
          let line = `- ${checkbox} ${task.title}`;
          if (task.priority) line += ` [\`${task.priority}\`]`;
          if (task.estimate) line += ` (${task.estimate})`;
          lines.push(line);
        }
      }
      
      return lines.join('\n');
    },
    
    /**
     * Get workflow state
     */
    getState(): SpecWorkflow {
      return { ...workflow, tasks: [...workflow.tasks] };
    }
  };
}
