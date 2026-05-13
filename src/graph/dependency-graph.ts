/**
 * Dependency Graph - pi-pipeline
 * 
 * Task dependency resolution with cycle detection.
 */

export interface DependencyNode {
  id: string;
  dependencies: string[];
  status?: 'pending' | 'in-progress' | 'done';
}

export interface DependencyGraph {
  findBlockedTasks(): string[];
  isTaskReady(taskId: string): boolean;
  getBlockingTasks(taskId: string): string[];
  detectCycles(): string[][];
  topologicalSort(): string[];
}

/**
 * Creates dependency graph manager
 */
export function createDependencyGraph<T extends DependencyNode>(nodes: T[]) {
  const nodeMap = new Map<string, T>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  
  function getCompletedIds(): Set<string> {
    return new Set(
      Array.from(nodeMap.values())
        .filter(n => n.status === 'done')
        .map(n => n.id)
    );
  }
  
  return {
    findBlockedTasks(): string[] {
      const completed = getCompletedIds();
      return Array.from(nodeMap.values())
        .filter(n => 
          n.status !== 'done' && 
          n.dependencies.length > 0 &&
          n.dependencies.some(dep => !completed.has(dep))
        )
        .map(n => n.id);
    },
    
    isTaskReady(taskId: string): boolean {
      const node = nodeMap.get(taskId);
      if (!node) return false;
      if (node.status === 'done') return false;
      if (node.dependencies.length === 0) return true;
      
      const completed = getCompletedIds();
      return node.dependencies.every(dep => completed.has(dep));
    },
    
    getBlockingTasks(taskId: string): string[] {
      const node = nodeMap.get(taskId);
      if (!node) return [];
      
      const completed = getCompletedIds();
      return node.dependencies.filter(dep => !completed.has(dep));
    },
    
    detectCycles(): string[][] {
      const WHITE = 0, GRAY = 1, BLACK = 2;
      const color = new Map<string, number>();
      for (const id of nodeMap.keys()) color.set(id, WHITE);
      
      const cycles: string[][] = [];
      const stack: string[] = [];
      
      function dfs(nodeId: string): void {
        color.set(nodeId, GRAY);
        stack.push(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (node) {
          for (const dep of node.dependencies) {
            const c = color.get(dep);
            if (c === GRAY) {
              const start = stack.indexOf(dep);
              cycles.push(stack.slice(start));
            } else if (c === WHITE) {
              dfs(dep);
            }
          }
        }
        
        stack.pop();
        color.set(nodeId, BLACK);
      }
      
      for (const id of nodeMap.keys()) {
        if (color.get(id) === WHITE) dfs(id);
      }
      
      return cycles;
    },
    
    topologicalSort(): string[] {
      // Build reverse adjacency: what depends on each node
      const dependents = new Map<string, string[]>();
      const inDegree = new Map<string, number>();
      
      for (const id of nodeMap.keys()) {
        dependents.set(id, []);
        inDegree.set(id, 0);
      }
      
      for (const node of nodeMap.values()) {
        for (const dep of node.dependencies) {
          if (dependents.has(dep)) {
            dependents.get(dep)!.push(node.id);
            inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
          }
        }
      }
      
      // Kahn's algorithm
      const queue: string[] = [];
      for (const [id, degree] of inDegree) {
        if (degree === 0) queue.push(id);
      }
      
      const result: string[] = [];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        result.push(current);
        
        // Reduce in-degree of dependents
        for (const dependent of dependents.get(current) || []) {
          const newDegree = (inDegree.get(dependent) || 1) - 1;
          inDegree.set(dependent, newDegree);
          if (newDegree === 0) queue.push(dependent);
        }
      }
      
      return result;
    },
    
    getExecutionOrder(): string[] {
      const cycles = this.detectCycles();
      if (cycles.length > 0) {
        throw new Error(`Circular dependencies detected: ${cycles[0].join(' -> ')}`);
      }
      return this.topologicalSort();
    }
  };
}
