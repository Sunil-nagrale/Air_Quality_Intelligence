import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AirQualityIntelligenceStack } from '../lib/backend-stack';

describe('AirQualityIntelligenceStack Retention and Context Invariants', () => {
  it('throws fail-fast error when deployment context "env" is omitted', () => {
    const app = new cdk.App();
    assert.throws(
      () => {
        new AirQualityIntelligenceStack(app, 'TestStackNoEnv');
      },
      /Deployment context 'env' is required/
    );
  });

  it('throws fail-fast error when deployment context "env" is invalid or ambiguous', () => {
    const app = new cdk.App({
      context: {
        env: 'staging-unsupported',
      },
    });
    assert.throws(
      () => {
        new AirQualityIntelligenceStack(app, 'TestStackInvalidEnv');
      },
      /Deployment context 'env' is required and must be either 'prod'/
    );
  });

  it('enforces DeletionPolicy: Retain and UpdateReplacePolicy: Retain across stateful resources under env=prod', () => {
    const app = new cdk.App({
      context: {
        env: 'prod',
      },
    });
    const stack = new AirQualityIntelligenceStack(app, 'ProdTestStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
    });
    const template = Template.fromStack(stack);

    // 1. Cognito UserPool
    template.hasResource('AWS::Cognito::UserPool', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });

    // 2. All 4 DynamoDB Tables
    const tables = template.findResources('AWS::DynamoDB::Table');
    assert.strictEqual(Object.keys(tables).length, 4, 'Must define exactly 4 domain tables');
    for (const [tableId, tableResource] of Object.entries(tables)) {
      assert.strictEqual(
        (tableResource as any).DeletionPolicy,
        'Retain',
        `Table ${tableId} must have DeletionPolicy: Retain in production`
      );
      assert.strictEqual(
        (tableResource as any).UpdateReplacePolicy,
        'Retain',
        `Table ${tableId} must have UpdateReplacePolicy: Retain in production`
      );
    }

    // 3. S3 Assets Bucket
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });

    // Verify autoDeleteObjects custom resource is disabled in prod
    const customResources = template.findResources('Custom::S3AutoDeleteObjects');
    assert.strictEqual(
      Object.keys(customResources).length,
      0,
      'Production stack must not synthesize S3 autoDeleteObjects custom resource'
    );
  });

  it('configures DeletionPolicy: Delete for ephemeral prototype lifecycle under env=sandbox', () => {
    const app = new cdk.App({
      context: {
        env: 'sandbox',
      },
    });
    const stack = new AirQualityIntelligenceStack(app, 'SandboxTestStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
    });
    const template = Template.fromStack(stack);

    // Cognito UserPool
    template.hasResource('AWS::Cognito::UserPool', {
      DeletionPolicy: 'Delete',
    });

    // DynamoDB Tables
    const tables = template.findResources('AWS::DynamoDB::Table');
    assert.strictEqual(Object.keys(tables).length, 4);
    for (const [tableId, tableResource] of Object.entries(tables)) {
      assert.strictEqual(
        (tableResource as any).DeletionPolicy,
        'Delete',
        `Table ${tableId} must have DeletionPolicy: Delete in sandbox`
      );
    }

    // S3 Assets Bucket
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
    });
  });
});
