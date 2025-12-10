import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const getDynamoDBClient = (): DynamoDBDocumentClient => {
  const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.STAGE === 'local' && {
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      },
    }),
  });

  return DynamoDBDocumentClient.from(dynamoClient);
};

export const getTableName = (): string => {
  return process.env.TABLE_NAME || 'ELearningPlatform-local';
};
