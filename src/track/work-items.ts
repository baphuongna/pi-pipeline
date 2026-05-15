/**
 * Work Items Tracking - pi-pipeline
 * 
 * Links agent sessions to project work items (issues, tasks, PRs).
 */


import { randomUUID } from 'node:crypto';
export interface WorkItem {
  id: string;
  type: 'issue' | 'task' | 'pr';
  title: string;
  description?: string;
  status: 'open' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  linkedSession?: string;
  assignee?: string;
  labels?: string[];
  created: number;
  updated: number;
  completed?: number;
}

export interface WorkItemFilter {
  type?: WorkItem['type'];
  status?: WorkItem['status'];
  priority?: WorkItem['priority'];
  linkedSession?: string;
  assignee?: string;
  label?: string;
}

/**
 * Creates work item tracker
 */
export function createWorkItemTracker() {
  const items = new Map<string, WorkItem>();
  const sessionIndex = new Map<string, Set<string>>(); // sessionId -> Set<itemId>
  
  function generateId(): string {
    return `WI-${randomUUID()}`;
  }
  
  return {
    /**
     * Create a new work item
     */
    create(input: Omit<WorkItem, 'id' | 'created' | 'updated'>): WorkItem {
      const now = Date.now();
      const item: WorkItem = {
        ...input,
        id: generateId(),
        created: now,
        updated: now
      };
      
      items.set(item.id, item);
      
      // Index by session if linked
      if (item.linkedSession) {
        if (!sessionIndex.has(item.linkedSession)) {
          sessionIndex.set(item.linkedSession, new Set());
        }
        sessionIndex.get(item.linkedSession)!.add(item.id);
      }
      
      return item;
    },
    
    /**
     * Get work item by ID
     */
    get(id: string): WorkItem | undefined {
      return items.get(id);
    },
    
    /**
     * Update work item
     */
    update(id: string, updates: Partial<Omit<WorkItem, 'id' | 'created'>>): WorkItem | undefined {
      const item = items.get(id);
      if (!item) return undefined;
      
      const updated: WorkItem = {
        ...item,
        ...updates,
        updated: Date.now()
      };
      
      // Handle status change to done
      if (updates.status === 'done' && !item.completed) {
        updated.completed = Date.now();
      }
      
      // Handle session link change
      if (updates.linkedSession !== undefined) {
        // Remove from old session
        if (item.linkedSession) {
          sessionIndex.get(item.linkedSession)?.delete(id);
        }
        // Add to new session
        if (updates.linkedSession) {
          if (!sessionIndex.has(updates.linkedSession)) {
            sessionIndex.set(updates.linkedSession, new Set());
          }
          sessionIndex.get(updates.linkedSession)!.add(id);
        }
      }
      
      items.set(id, updated);
      return updated;
    },
    
    /**
     * Link work item to session
     */
    link(itemId: string, sessionId: string): void {
      this.update(itemId, { linkedSession: sessionId, status: 'in-progress' });
    },
    
    /**
     * Unlink work item from session
     */
    unlink(itemId: string): void {
      const item = items.get(itemId);
      if (item?.linkedSession) {
        sessionIndex.get(item.linkedSession)?.delete(itemId);
      }
      this.update(itemId, { linkedSession: undefined });
    },
    
    /**
     * Update status
     */
    updateStatus(itemId: string, status: WorkItem['status']): WorkItem | undefined {
      return this.update(itemId, { status });
    },
    
    /**
     * Delete work item
     */
    delete(id: string): boolean {
      const item = items.get(id);
      if (item?.linkedSession) {
        sessionIndex.get(item.linkedSession)?.delete(id);
      }
      return items.delete(id);
    },
    
    /**
     * Get work items by filter
     */
    list(filter: WorkItemFilter = {}): WorkItem[] {
      const result: WorkItem[] = [];
      
      for (const item of items.values()) {
        if (filter.type && item.type !== filter.type) continue;
        if (filter.status && item.status !== filter.status) continue;
        if (filter.priority && item.priority !== filter.priority) continue;
        if (filter.linkedSession && item.linkedSession !== filter.linkedSession) continue;
        if (filter.assignee && item.assignee !== filter.assignee) continue;
        if (filter.label && !item.labels?.includes(filter.label)) continue;
        result.push(item);
      }
      
      return result.sort((a, b) => {
        // Sort by priority, then by updated
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return b.updated - a.updated;
      });
    },
    
    /**
     * Get items linked to session
     */
    getLinked(sessionId: string): WorkItem[] {
      const itemIds = sessionIndex.get(sessionId);
      if (!itemIds) return [];
      return Array.from(itemIds).map(id => items.get(id)!);
    },
    
    /**
     * Get session statistics
     */
    getSessionStats(sessionId: string): {
      total: number;
      open: number;
      done: number;
      inProgress: number;
    } {
      const linked = this.getLinked(sessionId);
      return {
        total: linked.length,
        open: linked.filter(i => i.status === 'open').length,
        done: linked.filter(i => i.status === 'done').length,
        inProgress: linked.filter(i => i.status === 'in-progress').length
      };
    },
    
    /**
     * Generate markdown report
     */
    generateReport(items: WorkItem[]): string {
      const lines = ['## Work Items Report\n'];
      
      const byStatus = {
        'in-progress': items.filter(i => i.status === 'in-progress'),
        'open': items.filter(i => i.status === 'open'),
        'blocked': items.filter(i => i.status === 'blocked'),
        'done': items.filter(i => i.status === 'done')
      };
      
      for (const [status, list] of Object.entries(byStatus)) {
        if (list.length === 0) continue;
        lines.push(`\n### ${status.replace('-', ' ').toUpperCase()} (${list.length})\n`);
        for (const item of list) {
          lines.push(`- ${item.id} ${item.title} [${item.priority}]`);
        }
      }
      
      return lines.join('\n');
    }
  };
}
