#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AirQualityIntelligenceStack } from '../lib/backend-stack';

const app = new cdk.App();

// Target region ap-south-1 (Mumbai, closest to Delhi-NCR / Punjab / Haryana)
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '663252309163',
  region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
};

new AirQualityIntelligenceStack(app, 'AirQualityIntelligenceStack', {
  env,
  description: 'Environmental Intelligence Platform: Personal Copilot, School Safety, Parali Marketplace',
});
