import { 
  DynamoDBClient, 
  CreateTableCommand,
  CreateTableCommandInput,
  KeyType,
  ScalarAttributeType,
  BillingMode,
  ProjectionType
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

async function createTable() {
  const params: CreateTableCommandInput = {
    TableName: 'ELearningPlatform-local',
    KeySchema: [
      { AttributeName: 'PK', KeyType: KeyType.HASH },
      { AttributeName: 'SK', KeyType: KeyType.RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'SK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'GSI1PK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'GSI1SK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'GSI2PK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'GSI2SK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'GSI3PK', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'GSI3SK', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: KeyType.HASH },
          { AttributeName: 'GSI1SK', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
      {
        IndexName: 'GSI2',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: KeyType.HASH },
          { AttributeName: 'GSI2SK', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
      {
        IndexName: 'GSI3',
        KeySchema: [
          { AttributeName: 'GSI3PK', KeyType: KeyType.HASH },
          { AttributeName: 'GSI3SK', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  };

  try {
    await client.send(new CreateTableCommand(params));
    console.log('✅ Table created successfully!');
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  Table already exists');
    } else {
      console.error('❌ Error creating table:', error);
    }
  }
}

createTable();
