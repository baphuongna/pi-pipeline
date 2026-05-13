import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createEventPipeline } from '../../src/event/event-pipeline.js';

describe('Event Pipeline', () => {
  it('emits to handlers', () => {
    const pipeline = createEventPipeline();
    let count = 0;
    
    pipeline.on('test', () => { count++; });
    pipeline.emit('test', null);
    
    assert.strictEqual(count, 1);
  });

  it('unsubscribes', () => {
    const pipeline = createEventPipeline();
    let count = 0;
    
    const unsub = pipeline.on('test', () => { count++; });
    pipeline.emit('test', null);
    unsub();
    pipeline.emit('test', null);
    
    assert.strictEqual(count, 1);
  });

  it('handles once', () => {
    const pipeline = createEventPipeline();
    let count = 0;
    
    pipeline.once('test', () => { count++; });
    pipeline.emit('test', null);
    pipeline.emit('test', null);
    
    assert.strictEqual(count, 1);
  });

  it('clears handlers', () => {
    const pipeline = createEventPipeline();
    
    pipeline.on('test', () => {});
    pipeline.clear();
    
    const handlers = pipeline.getHandlers('test');
    assert.strictEqual(handlers.length, 0);
  });

  it('passes data to handlers', () => {
    const pipeline = createEventPipeline();
    let received: unknown = null;
    
    pipeline.on<{value: number}>('test', (data) => { received = data; });
    pipeline.emit('test', { value: 42 });
    
    assert.deepStrictEqual(received, { value: 42 });
  });
});
