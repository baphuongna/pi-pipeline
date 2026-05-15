/**
 * Boil the Lake Tests - Pattern from gstack ethos
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  shouldComplete,
  COMPRESSION_RATIOS,
  formatCompressionRatio,
  searchBeforeBuildingCheck,
} from '../../src/ethos/boil-the-lake.ts';

describe('BoilTheLake', () => {
  describe('shouldComplete', () => {
    it('should prefer higher coverage with reasonable cost', () => {
      const result = shouldComplete(95, 150, 80, 50);
      assert.strictEqual(result.complete, true);
    });
    
    it('should prefer 90%+ coverage', () => {
      const result = shouldComplete(90, 100, 85, 50);
      assert.strictEqual(result.complete, true);
      assert.ok(result.reason.includes('90%+'));
    });
    
    it('should reject when B is sufficient', () => {
      const result = shouldComplete(75, 100, 70, 50);
      assert.strictEqual(result.complete, false);
    });
    
    it('should recommend complete for significant coverage difference', () => {
      const result = shouldComplete(90, 200, 60, 100);
      assert.strictEqual(result.complete, true);
      assert.ok(result.reason.includes('completeness is cheap'));
    });
    
    it('should prefer complete with large delta lines but >20% coverage diff', () => {
      const result = shouldComplete(92, 200, 70, 100);
      assert.strictEqual(result.complete, true);
      assert.ok(result.reason.includes('completeness is cheap'));
    });
  });
  
  describe('COMPRESSION_RATIOS', () => {
    it('should have standard ratios', () => {
      assert.strictEqual(COMPRESSION_RATIOS.boilerplate.ratio, 100);
      assert.strictEqual(COMPRESSION_RATIOS.tests.ratio, 50);
      assert.strictEqual(COMPRESSION_RATIOS.feature.ratio, 30);
      assert.strictEqual(COMPRESSION_RATIOS.bugFix.ratio, 20);
    });
  });
  
  describe('formatCompressionRatio', () => {
    it('should format with defaults', () => {
      const result = formatCompressionRatio('boilerplate');
      assert.ok(result.includes('~100x compression'));
      assert.ok(result.includes('48h human'));
      assert.ok(result.includes('15min AI'));
    });
    
    it('should format with actual values', () => {
      const result = formatCompressionRatio('bugFix', 2, 5);
      assert.ok(result.includes('~24x compression'));
      assert.ok(result.includes('2h human'));
      assert.ok(result.includes('5min AI'));
    });
  });
  
  describe('searchBeforeBuildingCheck', () => {
    it('should recommend search for known types', () => {
      const result = searchBeforeBuildingCheck('pattern');
      assert.strictEqual(result.shouldSearch, true);
      assert.strictEqual(result.layers.length, 3);
    });
    
    it('should list three layers', () => {
      const result = searchBeforeBuildingCheck('runtime');
      assert.ok(result.layers[0].includes('Tried and true'));
      assert.ok(result.layers[1].includes('New and popular'));
      assert.ok(result.layers[2].includes('Search first'));
    });
  });
});
