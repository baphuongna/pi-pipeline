import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createDependencyGraph } from '../../src/graph/dependency-graph.ts';

describe('Dependency Graph', () => {
  it('finds blocked tasks', () => {
    const graph = createDependencyGraph([
      { id: 'a', dependencies: [], status: 'done' },
      { id: 'b', dependencies: ['a'], status: 'done' },
      { id: 'c', dependencies: ['a'], status: 'pending' },
      { id: 'd', dependencies: ['b', 'c'], status: 'pending' },
    ]);
    
    const blocked = graph.findBlockedTasks();
    assert.ok(blocked.includes('d'));
  });

  it('checks task readiness', () => {
    const graph = createDependencyGraph([
      { id: 'a', dependencies: [], status: 'pending' },
      { id: 'b', dependencies: ['a'], status: 'pending' },
    ]);
    
    assert.strictEqual(graph.isTaskReady('a'), true);
    assert.strictEqual(graph.isTaskReady('b'), false);
  });

  it('gets blocking tasks', () => {
    const graph = createDependencyGraph([
      { id: 'a', dependencies: [], status: 'pending' },
      { id: 'b', dependencies: ['a'], status: 'pending' },
    ]);
    
    const blocking = graph.getBlockingTasks('b');
    assert.deepStrictEqual(blocking, ['a']);
  });

  it('detects cycles', () => {
    const graph = createDependencyGraph([
      { id: 'a', dependencies: ['b'], status: 'pending' },
      { id: 'b', dependencies: ['a'], status: 'pending' },
    ]);
    
    const cycles = graph.detectCycles();
    assert.ok(cycles.length > 0);
  });

  it('topological sorts', () => {
    const graph = createDependencyGraph([
      { id: 'c', dependencies: ['b'], status: 'pending' },
      { id: 'b', dependencies: ['a'], status: 'pending' },
      { id: 'a', dependencies: [], status: 'pending' },
    ]);
    
    const order = graph.topologicalSort();
    assert.strictEqual(order[0], 'a');
    assert.strictEqual(order[2], 'c');
  });

  it('gets execution order without cycles', () => {
    const graph = createDependencyGraph([
      { id: 'b', dependencies: ['a'], status: 'pending' },
      { id: 'a', dependencies: [], status: 'pending' },
    ]);
    
    const order = graph.getExecutionOrder();
    assert.strictEqual(order[0], 'a');
    assert.strictEqual(order[1], 'b');
  });
});
