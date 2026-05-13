import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createSessionPlanner } from '../../src/plan/session-plan.js';

describe('Session Planner', () => {
  const planner = createSessionPlanner();

  it('creates plans', () => {
    const plan = planner.create('Test Plan', 'Description');
    assert.ok(plan.id);
    assert.strictEqual(plan.title, 'Test Plan');
    assert.strictEqual(plan.progress, 0);
  });

  it('adds milestones', () => {
    const plan = planner.create('Test');
    const milestone = planner.addMilestone(plan.id, 'Milestone 1');
    assert.ok(milestone);
    assert.strictEqual(milestone?.title, 'Milestone 1');
  });

  it('links sessions', () => {
    const plan = planner.create('Test');
    planner.linkSession(plan.id, 'session-1');
    const linked = planner.getBySession('session-1');
    assert.strictEqual(linked.length, 1);
  });

  it('completes milestones', () => {
    const plan = planner.create('Test');
    const milestone = planner.addMilestone(plan.id, 'M1');
    planner.completeMilestone(plan.id, milestone!.id);
    
    const updated = planner.get(plan.id);
    assert.strictEqual(updated?.progress, 100);
  });

  it('gets active plans', () => {
    planner.create('Active Plan');
    planner.create('Paused Plan');
    
    const active = planner.getActive();
    assert.ok(active.length >= 1);
  });

  it('generates report', () => {
    const plan = planner.create('Test Plan');
    planner.addMilestone(plan.id, 'M1');
    
    const report = planner.generateReport(plan.id);
    assert.ok(report?.includes('Test Plan'));
    assert.ok(report?.includes('M1'));
  });
});
