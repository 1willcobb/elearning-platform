export const productionConfig = {
  environment: 'production',
  
  stackName: 'ELearningPlatform-Prod',
  
  tags: {
    Environment: 'production',
    Project: 'ELearningPlatform',
    ManagedBy: 'CDK',
  },
  
  dynamodb: {
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: true,
    removalPolicy: 'RETAIN',
    deletionProtection: true, // Extra safety
  },
  
  api: {
    throttling: {
      rateLimit: 1000,
      burstLimit: 2000,
    },
  },
  
  cognito: {
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireDigits: true,
      requireSymbols: true,
    },
    mfa: 'OPTIONAL',
  },
  
  cdn: {
    priceClass: 'PRICE_CLASS_ALL',
  },
  
  backup: {
    enabled: true,
    retention: 30, // days
  },
};