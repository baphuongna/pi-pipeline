/**
 * SDLC Router Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  routeSDLC,
  getPathDescription,
  requiresAdditionalSteps,
  estimateTime,
} from '../../src/router/sdlc-router.ts';

describe('SDLCRouter', () => {
  describe('routeSDLC', () => {
    it('should route to path C for ambiguity', () => {
      const result = routeSDLC({
        hasBAInput: false,
        complexity: "medium",
        urgency: "medium",
        hasAmbiguity: true,
        requiresConsensus: false,
      });
      
      assert.strictEqual(result.path, "c");
      assert.ok(result.reason.includes("Ambiguity"));
    });
    
    it('should route to path C for consensus required', () => {
      const result = routeSDLC({
        hasBAInput: false,
        complexity: "low",
        urgency: "low",
        hasAmbiguity: false,
        requiresConsensus: true,
      });
      
      assert.strictEqual(result.path, "c");
    });
    
    it('should route to path A for high complexity', () => {
      const result = routeSDLC({
        hasBAInput: false,
        complexity: "high",
        urgency: "low",
        hasAmbiguity: false,
        requiresConsensus: false,
      });
      
      assert.strictEqual(result.path, "a");
    });
    
    it('should route to path B for low complexity high urgency', () => {
      const result = routeSDLC({
        hasBAInput: false,
        complexity: "low",
        urgency: "high",
        hasAmbiguity: false,
        requiresConsensus: false,
      });
      
      assert.strictEqual(result.path, "b");
    });
    
    it('should default to path A', () => {
      const result = routeSDLC({
        hasBAInput: false,
        complexity: "medium",
        urgency: "medium",
        hasAmbiguity: false,
        requiresConsensus: false,
      });
      
      assert.strictEqual(result.path, "a");
    });
    
    it('should include steps in result', () => {
      const result = routeSDLC({
        hasBAInput: true,
        complexity: "high",
        urgency: "low",
        hasAmbiguity: false,
        requiresConsensus: false,
      });
      
      assert.ok(result.steps.length > 0);
    });
  });
  
  describe('getPathDescription', () => {
    it('should return correct descriptions', () => {
      assert.strictEqual(getPathDescription("a"), "BA Pipeline (Full)");
      assert.strictEqual(getPathDescription("b"), "Quick Spec");
      assert.strictEqual(getPathDescription("c"), "Consensus Plan");
    });
  });
  
  describe('requiresAdditionalSteps', () => {
    it('should return true for paths A and C', () => {
      assert.strictEqual(requiresAdditionalSteps("a"), true);
      assert.strictEqual(requiresAdditionalSteps("c"), true);
    });
    
    it('should return false for path B', () => {
      assert.strictEqual(requiresAdditionalSteps("b"), false);
    });
  });
  
  describe('estimateTime', () => {
    it('should return time estimates', () => {
      assert.strictEqual(estimateTime("a", "high"), "2-4 hours");
      assert.strictEqual(estimateTime("b", "low"), "15-30 minutes");
      assert.strictEqual(estimateTime("c", "medium"), "30-60 minutes");
    });
  });
});
