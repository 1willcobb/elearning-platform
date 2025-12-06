#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ELearningStack } from '../lib/elearning-stack';
import { localConfig } from '../config/local';
import { preprodConfig } from '../config/preprod';
import { productionConfig } from '../config/production';

const app = new cdk.App();

// Get environment from context or default to local
const environment = app.node.tryGetContext('environment') || 'local';

let config;
let stackName;

switch (environment) {
  case 'preprod':
    config = preprodConfig;
    stackName = 'ELearningPlatform-PreProd';
    break;
  case 'production':
    config = productionConfig;
    stackName = 'ELearningPlatform-Prod';
    break;
  default:
    config = localConfig;
    stackName = 'ELearningPlatform-Local';
}

new ELearningStack(app, stackName, {
  config,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: environment,
    Project: 'ELearningPlatform',
  },
});

app.synth();