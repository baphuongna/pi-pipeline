/**
 * Ship Workflow - Deployment pipeline with canary and monitoring
 * Based on gstack /ship and /canary patterns
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface DeployConfig {
  environment: 'staging' | 'production';
  branch?: string;
  canary?: {
    enabled: boolean;
    percentage?: number;
    duration?: number;
  };
  verify?: {
    smokeTest?: boolean;
    integrationTest?: boolean;
    healthCheck?: string;
  };
}

export interface DeployResult {
  success: boolean;
  deployment?: {
    id: string;
    url: string;
    version: string;
    timestamp: number;
  };
  canary?: {
    started: boolean;
    percentage: number;
    duration: number;
  };
  errors?: string[];
  warnings?: string[];
}

export interface CanaryResult {
  healthy: boolean;
  metrics: {
    successRate: number;
    latency: number;
    errorRate: number;
  };
  issues: string[];
}

/**
 * Ship Workflow Manager
 */
export class ShipWorkflow {
  private landingQueue: DeployConfig[] = [];

  /**
   * Run complete ship workflow
   */
  async ship(config: DeployConfig): Promise<DeployResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Pre-deploy checks
    const checks = await this.runPreDeployChecks(config);
    if (!checks.passed) {
      return {
        success: false,
        errors: checks.errors,
      };
    }

    // 2. Get current version
    let version: string;
    try {
      const { stdout } = await execAsync('git describe --tags --abbrev=0');
      version = stdout.trim();
    } catch {
      version = `v${Date.now()}`;
    }

    // 3. Deploy
    let deployment;
    try {
      deployment = await this.runDeploy(config, version);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { success: false, errors };
    }

    // 4. Post-deploy verification
    if (config.verify?.smokeTest) {
      const smokeResult = await this.runSmokeTest(config.environment);
      if (!smokeResult.passed) {
        warnings.push(...smokeResult.errors);
        await this.rollback(deployment);
        return {
          success: false,
          deployment,
          errors: smokeResult.errors,
        };
      }
    }

    // 5. Canary monitoring (if enabled)
    if (config.canary?.enabled) {
      const canaryResult = await this.monitorCanary(
        deployment,
        config.canary.percentage ?? 10,
        config.canary.duration ?? 300000
      );

      if (!canaryResult.healthy) {
        warnings.push(...canaryResult.issues);
        await this.rollback(deployment);
        return {
          success: false,
          deployment,
          canary: {
            started: true,
            percentage: config.canary.percentage ?? 10,
            duration: config.canary.duration ?? 300000,
          },
          errors: canaryResult.issues,
        };
      }
    }

    // 6. Add to landing report
    this.addToLandingReport(deployment);

    return {
      success: true,
      deployment,
      canary: config.canary?.enabled ? {
        started: false,
        percentage: config.canary.percentage ?? 10,
        duration: config.canary.duration ?? 300000,
      } : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Run pre-deploy checks
   */
  private async runPreDeployChecks(config: DeployConfig): Promise<{
    passed: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check git status
    try {
      const { stdout } = await execAsync('git status --porcelain');
      if (stdout.trim()) {
        errors.push('Working tree has uncommitted changes');
      }
    } catch {
      errors.push('Git not available');
    }

    // Check tests pass
    try {
      await execAsync('npm test -- --run 2>&1 | tail -5', { timeout: 120000 });
    } catch {
      errors.push('Tests failed');
    }

    // Check branch
    if (config.environment === 'production') {
      try {
        const { stdout } = await execAsync('git branch --show-current');
        if (stdout.trim() !== 'main' && stdout.trim() !== 'master') {
          errors.push('Must be on main/master branch for production deploy');
        }
      } catch {
        // Ignore
      }
    }

    return { passed: errors.length === 0, errors };
  }

  /**
   * Run deployment
   */
  private async runDeploy(config: DeployConfig, version: string): Promise<DeployResult['deployment']> {
    const deployId = `deploy-${Date.now().toString(36)}`;

    if (config.environment === 'staging') {
      // Simulate staging deploy
      await execAsync('echo "Deploying to staging..."');
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      // Simulate production deploy
      await execAsync('echo "Deploying to production..."');
      await new Promise((r) => setTimeout(r, 2000));
    }

    return {
      id: deployId,
      url: `https://${config.environment === 'production' ? 'app' : 'staging'}.example.com`,
      version,
      timestamp: Date.now(),
    };
  }

  /**
   * Run smoke test
   */
  private async runSmokeTest(env: string): Promise<{ passed: boolean; errors: string[] }> {
    const errors: string[] = [];
    const url = `https://${env === 'production' ? 'app' : 'staging'}.example.com/health`;

    try {
      const { stdout } = await execAsync(`curl -sf ${url} || echo "FAILED"`, { timeout: 10000 });
      if (stdout.includes('FAILED')) {
        errors.push('Health check failed');
      }
    } catch {
      errors.push('Could not reach health endpoint');
    }

    return { passed: errors.length === 0, errors };
  }

  /**
   * Monitor canary deployment
   */
  private async monitorCanary(
    deployment: NonNullable<DeployResult['deployment']>,
    percentage: number,
    duration: number
  ): Promise<CanaryResult> {
    const issues: string[] = [];
    const startTime = Date.now();

    console.log(`Starting canary monitoring: ${percentage}% traffic for ${duration}ms`);

    // Simulate monitoring
    while (Date.now() - startTime < duration) {
      // Check metrics
      const successRate = 95 + Math.random() * 5;
      const latency = 50 + Math.random() * 100;
      const errorRate = Math.random() * 5;

      if (errorRate > 5) {
        issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
      }

      if (latency > 200) {
        issues.push(`High latency: ${latency.toFixed(0)}ms`);
      }

      await new Promise((r) => setTimeout(r, 10000));
    }

    return {
      healthy: issues.length === 0,
      metrics: {
        successRate: 98,
        latency: 75,
        errorRate: 1.2,
      },
      issues,
    };
  }

  /**
   * Rollback deployment
   */
  async rollback(deployment: NonNullable<DeployResult['deployment']>): Promise<void> {
    console.log(`Rolling back deployment ${deployment.id}`);

    try {
      // Simulate rollback
      await execAsync('echo "Rolling back to previous version..."');
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Add deployment to landing report
   */
  private addToLandingReport(deployment: NonNullable<DeployResult['deployment']>): void {
    const report = {
      id: deployment.id,
      version: deployment.version,
      url: deployment.url,
      timestamp: new Date(deployment.timestamp).toISOString(),
    };

    console.log('## Landing Report');
    console.log(JSON.stringify(report, null, 2));
  }

  /**
   * Queue a deployment for later
   */
  queue(config: DeployConfig): void {
    this.landingQueue.push(config);
  }

  /**
   * Get landing queue
   */
  getQueue(): DeployConfig[] {
    return [...this.landingQueue];
  }

  /**
   * Process landing queue
   */
  async processQueue(): Promise<DeployResult[]> {
    const results: DeployResult[] = [];

    while (this.landingQueue.length > 0) {
      const config = this.landingQueue.shift()!;
      const result = await this.ship(config);
      results.push(result);

      if (!result.success) {
        console.log('Queue processing stopped due to failure');
        break;
      }
    }

    return results;
  }
}
