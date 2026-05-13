import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createSpecWorkflow } from '../../src/spec/spec-workflow.js';

describe('Spec Workflow', () => {
  const workflow = createSpecWorkflow();

  it('creates spec document', () => {
    const spec = workflow.createSpec({
      feature: 'Test Feature',
      overview: 'Test overview',
      requirements: ['Req 1', 'Req 2']
    });
    
    assert.strictEqual(spec.feature, 'Test Feature');
    assert.strictEqual(spec.requirements.length, 2);
  });

  it('adds tasks', () => {
    const task = workflow.addTask('Test Task', { priority: 'high' });
    assert.ok(task.id);
    assert.strictEqual(task.title, 'Test Task');
    assert.strictEqual(task.priority, 'high');
  });

  it('updates task status', () => {
    const task = workflow.addTask('Task 1');
    workflow.updateTask(task.id, { status: 'in-progress' });
    
    const updated = workflow.getPending().find(t => t.id === task.id);
    assert.strictEqual(updated?.status, 'in-progress');
  });

  it('completes tasks', () => {
    const task = workflow.addTask('Task 2');
    workflow.completeTask(task.id);
    
    const progress = workflow.getProgress();
    assert.strictEqual(progress.done, 1);
  });

  it('generates SPEC.md', () => {
    workflow.createSpec({
      feature: 'F1',
      overview: 'Overview',
      requirements: ['R1'],
      successCriteria: ['C1']
    });
    
    const md = workflow.generateSpecMd();
    assert.ok(md.includes('F1'));
    assert.ok(md.includes('R1'));
    assert.ok(md.includes('C1'));
  });

  it('generates TASKS.md', () => {
    workflow.addTask('T1');
    workflow.addTask('T2');
    
    const md = workflow.generateTasksMd();
    assert.ok(md.includes('T1'));
    assert.ok(md.includes('T2'));
  });
});
