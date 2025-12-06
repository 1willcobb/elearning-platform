export const preprodConfig = {
  environment: 'preprod',
  
  stackName: 'ELearningPlatform-PreProd',
  
  tags: {
    Environment: 'preprod',
    Project: 'ELearningPlatform',
    ManagedBy: 'CDK',
  },
  
  dynamodb: {
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: true,
    removalPolicy: 'RETAIN',
  },
  
  api: {
    throttling: {
      rateLimit: 100,
      burstLimit: 200,
    },
  },
  
  cognito: {
    passwordPolicy: {
      minLength: 8,
    },
  },
  
  cdn: {
    priceClass: 'PRICE_CLASS_100',
  },
};