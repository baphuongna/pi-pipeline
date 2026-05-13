/**
 * ADR Tests - Pattern from gsd-2 ADR system
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  createDecisionRegistry,
  createADR,
  formatDecisionAsMarkdown,
} from '../../src/decisions/adr.js';

describe('ADR', () => {
  describe('createDecisionRegistry', () => {
    it('should create empty registry', () => {
      const registry = createDecisionRegistry();
      assert.strictEqual(registry.list().length, 0);
    });
    
    it('should add decisions', () => {
      const registry = createDecisionRegistry();
      const adr = createADR({
        id: 'ADR-001',
        title: 'Test Decision',
        deciders: ['Alice', 'Bob'],
        context: 'We need to make a decision',
        decision: 'Do this',
      });
      
      registry.add(adr);
      assert.strictEqual(registry.list().length, 1);
      assert.strictEqual(registry.get('ADR-001')?.title, 'Test Decision');
    });
    
    it('should supersede decisions', () => {
      const registry = createDecisionRegistry();
      
      registry.add(createADR({
        id: 'ADR-001',
        title: 'Old Decision',
        deciders: ['Alice'],
        context: 'Context',
        decision: 'Old',
      }));
      
      registry.add(createADR({
        id: 'ADR-002',
        title: 'New Decision',
        deciders: ['Alice', 'Bob'],
        context: 'Context',
        decision: 'New',
      }));
      
      registry.supersede('ADR-001', 'ADR-002');
      
      const old = registry.get('ADR-001');
      assert.strictEqual(old?.status, 'superseded');
      assert.strictEqual(old?.supersededBy, 'ADR-002');
    });
    
    it('should list sorted by date descending', () => {
      const registry = createDecisionRegistry();
      
      const adr1 = createADR({
        id: 'ADR-001',
        title: 'First',
        deciders: ['Alice'],
        context: 'C',
        decision: 'D',
      });
      adr1.date = '2024-01-01';
      
      const adr2 = createADR({
        id: 'ADR-002',
        title: 'Second',
        deciders: ['Alice'],
        context: 'C',
        decision: 'D',
      });
      adr2.date = '2024-01-15';
      
      registry.add(adr1);
      registry.add(adr2);
      
      const list = registry.list();
      assert.strictEqual(list[0].id, 'ADR-002');
      assert.strictEqual(list[1].id, 'ADR-001');
    });
  });
  
  describe('createADR', () => {
    it('should create with default values', () => {
      const adr = createADR({
        id: 'ADR-001',
        title: 'Test',
        deciders: ['Alice'],
        context: 'Context',
        decision: 'Decision',
      });
      
      assert.strictEqual(adr.status, 'proposed');
      assert.match(adr.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.deepStrictEqual(adr.consequences.positive, []);
      assert.deepStrictEqual(adr.consequences.negative, []);
      assert.deepStrictEqual(adr.consequences.neutral, []);
    });
    
    it('should include consequences', () => {
      const adr = createADR({
        id: 'ADR-001',
        title: 'Test',
        deciders: ['Alice'],
        context: 'Context',
        decision: 'Decision',
        positive: ['Good outcome'],
        negative: ['Trade-off'],
        neutral: ['Side effect'],
      });
      
      assert.ok(adr.consequences.positive.includes('Good outcome'));
      assert.ok(adr.consequences.negative.includes('Trade-off'));
      assert.ok(adr.consequences.neutral.includes('Side effect'));
    });
  });
  
  describe('formatDecisionAsMarkdown', () => {
    it('should format as markdown', () => {
      const adr = createADR({
        id: 'ADR-001',
        title: 'Test Decision',
        deciders: ['Alice', 'Bob'],
        context: 'Context for decision',
        decision: 'The decision made',
        positive: ['Positive outcome'],
        negative: ['Negative trade-off'],
      });
      
      const markdown = formatDecisionAsMarkdown(adr);
      
      assert.ok(markdown.includes('# ADR-001: Test Decision'));
      assert.ok(markdown.includes('**Status:** proposed'));
      assert.ok(markdown.includes('**Deciders:** Alice, Bob'));
      assert.ok(markdown.includes('## Context'));
      assert.ok(markdown.includes('Context for decision'));
      assert.ok(markdown.includes('### Positive'));
      assert.ok(markdown.includes('- Positive outcome'));
      assert.ok(markdown.includes('### Negative'));
      assert.ok(markdown.includes('- Negative trade-off'));
    });
  });
});
