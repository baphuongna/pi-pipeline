/**
 * Event Pipeline - pi-pipeline
 * 
 * Async event-driven architecture.
 * Ported from claude-mem.git event pipeline
 */

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface EventPipeline {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: EventHandler<T>): () => void;
  once<T>(event: string, handler: EventHandler<T>): () => void;
  off(event: string, handler?: EventHandler): void;
  pipeline(event: string, steps: EventHandler[]): void;
}

/**
 * Creates event pipeline manager
 */
export function createEventPipeline(): EventPipeline & { 
  getHandlers(event: string): EventHandler[];
  clear(): void;
} {
  const handlers = new Map<string, Set<EventHandler>>();
  const onceHandlers = new Map<string, Set<EventHandler>>();
  
  return {
    /**
     * Emit event to all handlers
     */
    emit<T>(event: string, data: T): void {
      // Regular handlers
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          try {
            const result = handler(data);
            if (result instanceof Promise) {
              result.catch(err => console.error(`Event handler error: ${err}`));
            }
          } catch (err) {
            console.error(`Event handler error: ${err}`);
          }
        }
      }
      
      // Once handlers
      const once = onceHandlers.get(event);
      if (once) {
        for (const handler of once) {
          try {
            handler(data);
          } catch (err) {
            console.error(`Once handler error: ${err}`);
          }
        }
        onceHandlers.delete(event);
      }
    },
    
    /**
     * Subscribe to event
     */
    on<T>(event: string, handler: EventHandler<T>): () => void {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler as EventHandler);
      
      // Return unsubscribe function
      return () => {
        handlers.get(event)?.delete(handler as EventHandler);
      };
    },
    
    /**
     * Subscribe once
     */
    once<T>(event: string, handler: EventHandler<T>): () => void {
      if (!onceHandlers.has(event)) {
        onceHandlers.set(event, new Set());
      }
      onceHandlers.get(event)!.add(handler as EventHandler);
      
      return () => {
        onceHandlers.get(event)?.delete(handler as EventHandler);
      };
    },
    
    /**
     * Unsubscribe
     */
    off(event: string, handler?: EventHandler): void {
      if (handler) {
        handlers.get(event)?.delete(handler);
        onceHandlers.get(event)?.delete(handler);
      } else {
        handlers.delete(event);
        onceHandlers.delete(event);
      }
    },
    
    /**
     * Create pipeline of handlers
     */
    pipeline(event: string, steps: EventHandler[]): void {
      for (let i = 0; i < steps.length - 1; i++) {
        const current = steps[i];
        const next = steps[i + 1];
        
        const pipelineHandler = async (data: unknown) => {
          await current(data);
          await next(data);
        };
        
        if (!handlers.has(event)) {
          handlers.set(event, new Set());
        }
        handlers.get(event)!.add(pipelineHandler as EventHandler);
      }
    },
    
    /**
     * Get handlers for event (for debugging)
     */
    getHandlers(event: string): EventHandler[] {
      const all = new Set<EventHandler>();
      handlers.get(event)?.forEach(h => all.add(h));
      onceHandlers.get(event)?.forEach(h => all.add(h));
      return Array.from(all);
    },
    
    /**
     * Clear all handlers
     */
    clear(): void {
      handlers.clear();
      onceHandlers.clear();
    }
  };
}
