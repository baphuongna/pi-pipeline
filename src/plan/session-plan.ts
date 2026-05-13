/**
 * Session Planning - pi-pipeline
 * 
 * Multi-session plan tracking for long-running projects.
 * Ported from pi-extensions.git pi-blueprint
 */

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done';
  sessions: string[];
  created: number;
  updated: number;
  completed?: number;
}

export interface SessionPlan {
  id: string;
  title: string;
  description?: string;
  milestones: Milestone[];
  sessions: string[];
  status: 'planning' | 'active' | 'completed' | 'paused';
  progress: number;
  created: number;
  updated: number;
}

/**
 * Creates session planner
 */
export function createSessionPlanner() {
  const plans = new Map<string, SessionPlan>();
  
  function generateId(): string {
    return `PLAN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  }
  
  function calculateProgress(plan: SessionPlan): number {
    if (plan.milestones.length === 0) return 0;
    const done = plan.milestones.filter(m => m.status === 'done').length;
    return Math.round((done / plan.milestones.length) * 100);
  }
  
  return {
    /**
     * Create a new plan
     */
    create(title: string, description?: string): SessionPlan {
      const plan: SessionPlan = {
        id: generateId(),
        title,
        description,
        milestones: [],
        sessions: [],
        status: 'planning',
        progress: 0,
        created: Date.now(),
        updated: Date.now()
      };
      
      plans.set(plan.id, plan);
      return plan;
    },
    
    /**
     * Get plan by ID
     */
    get(id: string): SessionPlan | undefined {
      return plans.get(id);
    },
    
    /**
     * Add milestone to plan
     */
    addMilestone(planId: string, title: string, description?: string): Milestone | undefined {
      const plan = plans.get(planId);
      if (!plan) return undefined;
      
      const milestone: Milestone = {
        id: generateId(),
        title,
        description,
        status: 'pending',
        sessions: [],
        created: Date.now(),
        updated: Date.now()
      };
      
      plan.milestones.push(milestone);
      plan.updated = Date.now();
      
      return milestone;
    },
    
    /**
     * Link session to plan
     */
    linkSession(planId: string, sessionId: string): void {
      const plan = plans.get(planId);
      if (!plan) return;
      
      if (!plan.sessions.includes(sessionId)) {
        plan.sessions.push(sessionId);
        plan.updated = Date.now();
      }
    },
    
    /**
     * Complete milestone
     */
    completeMilestone(planId: string, milestoneId: string): void {
      const plan = plans.get(planId);
      if (!plan) return;
      
      const milestone = plan.milestones.find(m => m.id === milestoneId);
      if (!milestone) return;
      
      milestone.status = 'done';
      milestone.completed = Date.now();
      milestone.updated = Date.now();
      
      plan.progress = calculateProgress(plan);
      plan.updated = Date.now();
      
      // Check if all milestones done
      if (plan.progress === 100) {
        plan.status = 'completed';
      }
    },
    
    /**
     * Get active plans
     */
    getActive(): SessionPlan[] {
      return Array.from(plans.values())
        .filter(p => p.status === 'active' || p.status === 'planning');
    },
    
    /**
     * Get plans by session
     */
    getBySession(sessionId: string): SessionPlan[] {
      return Array.from(plans.values())
        .filter(p => p.sessions.includes(sessionId));
    },
    
    /**
     * Generate plan report
     */
    generateReport(planId: string): string | undefined {
      const plan = plans.get(planId);
      if (!plan) return undefined;
      
      const lines = [`# ${plan.title}\n`];
      
      if (plan.description) {
        lines.push(`${plan.description}\n`);
      }
      
      lines.push(`Progress: ${plan.progress}%\n`);
      lines.push(`Status: ${plan.status}\n`);
      lines.push(`Sessions: ${plan.sessions.length}\n`);
      
      lines.push('\n## Milestones\n');
      for (const m of plan.milestones) {
        const status = m.status === 'done' ? '✅' : m.status === 'in-progress' ? '🔄' : '⬜';
        lines.push(`\n${status} ${m.title}`);
        if (m.description) {
          lines.push(`\n   ${m.description}`);
        }
        lines.push(`\n   Sessions: ${m.sessions.length}`);
      }
      
      return lines.join('\n');
    }
  };
}
