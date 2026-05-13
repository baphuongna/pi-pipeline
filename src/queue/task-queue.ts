/**
 * Task Queue Pattern
 * 
 * Priority queue for task scheduling.
 */

export type Priority = "low" | "normal" | "high" | "critical";

export interface QueuedTask<T = unknown> {
  id: string;
  data: T;
  priority: Priority;
  createdAt: number;
  retries: number;
  maxRetries: number;
}

export interface QueueOptions {
  /** Maximum queue size */
  maxSize?: number;
  /** Default max retries */
  defaultMaxRetries?: number;
}

/**
 * Priority queue for tasks.
 */
export class TaskQueue<T = unknown> {
  private queues = {
    critical: [] as QueuedTask<T>[],
    high: [] as QueuedTask<T>[],
    normal: [] as QueuedTask<T>[],
    low: [] as QueuedTask<T>[],
  };
  private readonly maxSize: number;
  private readonly defaultMaxRetries: number;
  private idCounter = 0;

  constructor(options: QueueOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultMaxRetries = options.defaultMaxRetries ?? 3;
  }

  /**
   * Enqueue a task.
   */
  enqueue(data: T, priority: Priority = "normal", maxRetries?: number): string {
    const id = `task-${++this.idCounter}-${Date.now()}`;
    
    const task: QueuedTask<T> = {
      id,
      data,
      priority,
      createdAt: Date.now(),
      retries: 0,
      maxRetries: maxRetries ?? this.defaultMaxRetries,
    };

    this.queues[priority].push(task);

    // Evict if over capacity
    this.evictIfNeeded();

    return id;
  }

  /**
   * Dequeue the next task.
   */
  dequeue(): QueuedTask<T> | undefined {
    // Priority order: critical > high > normal > low
    const priorities: Priority[] = ["critical", "high", "normal", "low"];
    
    for (const priority of priorities) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue.shift();
      }
    }

    return undefined;
  }

  /**
   * Peek at next task without removing.
   */
  peek(): QueuedTask<T> | undefined {
    const priorities: Priority[] = ["critical", "high", "normal", "low"];
    
    for (const priority of priorities) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue[0];
      }
    }

    return undefined;
  }

  /**
   * Remove a task by ID.
   */
  remove(id: string): boolean {
    for (const queue of Object.values(this.queues)) {
      const index = queue.findIndex((t) => t.id === id);
      if (index !== -1) {
        queue.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Retry a failed task.
   */
  retry(task: QueuedTask<T>): boolean {
    if (task.retries >= task.maxRetries) {
      return false;
    }
    
    task.retries++;
    this.queues[task.priority].push(task);
    return true;
  }

  /**
   * Get queue size.
   */
  get size(): number {
    return Object.values(this.queues).reduce((sum, q) => sum + q.length, 0);
  }

  /**
   * Check if queue is empty.
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Get size by priority.
   */
  getSizeByPriority(priority: Priority): number {
    return this.queues[priority].length;
  }

  /**
   * Clear the queue.
   */
  clear(): void {
    for (const queue of Object.values(this.queues)) {
      queue.length = 0;
    }
  }

  private evictIfNeeded(): void {
    while (this.size > this.maxSize) {
      // Remove oldest low priority task
      const low = this.queues.low;
      if (low.length > 0) {
        low.shift();
      } else {
        // If no low priority, remove from front of smallest queue
        for (const queue of Object.values(this.queues)) {
          if (queue.length > 0) {
            queue.shift();
            break;
          }
        }
      }
    }
  }
}

/**
 * Create a task queue.
 */
export function createTaskQueue<T = unknown>(options?: QueueOptions): TaskQueue<T> {
  return new TaskQueue(options);
}
