export const localConfig = {
  environment: 'local',
  
  dynamodb: {
    endpoint: 'http://localhost:8000',
    region: 'us-east-1',
  },
  
  api: {
    port: 3000,
    corsOrigins: ['http://localhost:8081'], // Expo default
  },
  
  auth: {
    // Use mock auth locally or test Cognito
    useMockAuth: true,
  },
  
  storage: {
    endpoint: 'http://localhost:9000', // MinIO or LocalStack
  },
};