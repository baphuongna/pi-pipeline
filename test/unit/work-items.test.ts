import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createWorkItemTracker } from '../../src/track/work-items.ts';

describe('Work Item Tracker', () => {
  it('creates work items', () => {
    const tracker = createWorkItemTracker();
    const item = tracker.create({
      type: 'issue',
      title: 'Fix bug',
      status: 'open',
      priority: 'high'
    });
    
    assert.ok(item.id);
    assert.strictEqual(item.title, 'Fix bug');
    assert.strictEqual(item.status, 'open');
  });

  it('links items to sessions', () => {
    const tracker = createWorkItemTracker();
    const item = tracker.create({
      type: 'task',
      title: 'Implement feature',
      status: 'open',
      priority: 'medium'
    });
    
    tracker.link(item.id, 'session-123');
    const linked = tracker.getLinked('session-123');
    
    assert.strictEqual(linked.length, 1);
    assert.strictEqual(linked[0].status, 'in-progress');
  });

  it('updates item status', () => {
    const tracker = createWorkItemTracker();
    const item = tracker.create({
      type: 'issue',
      title: 'Test',
      status: 'open',
      priority: 'low'
    });
    
    tracker.updateStatus(item.id, 'done');
    const updated = tracker.get(item.id);
    
    assert.strictEqual(updated?.status, 'done');
    assert.ok(updated?.completed);
  });

  it('filters by category', () => {
    const tracker = createWorkItemTracker();
    tracker.create({ type: 'issue', title: 'Issue 1', status: 'open', priority: 'high' });
    tracker.create({ type: 'task', title: 'Task 1', status: 'open', priority: 'medium' });
    
    const issues = tracker.list({ type: 'issue' });
    const tasks = tracker.list({ type: 'task' });
    
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(tasks.length, 1);
  });

  it('generates report', () => {
    const tracker = createWorkItemTracker();
    tracker.create({ type: 'issue', title: 'In Progress', status: 'in-progress', priority: 'high' });
    tracker.create({ type: 'issue', title: 'Done', title: 'Done', status: 'done', priority: 'low' });
    
    const report = tracker.generateReport(tracker.list());
    assert.ok(report.includes('IN PROGRESS'));
    assert.ok(report.includes('DONE'));
  });
});
