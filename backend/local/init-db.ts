import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
  KeyType,
  ScalarAttributeType,
  BillingMode,
  ProjectionType
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

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

async function seedSuperAdmin() {
  const tableName = 'ELearningPlatform-local';
  const superAdminEmail = 'admin@elearning.com';
  const superAdminUsername = 'superadmin';
  const superAdminPassword = 'Admin123!'; // Change this in production!

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    const userId = 'super-admin-001';
    const now = new Date().toISOString();

    // Create super admin user
    const userItem = {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      EntityType: 'User',
      userId,
      email: superAdminEmail,
      username: superAdminUsername,
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: hashedPassword,
      roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
      isActive: true,
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `EMAIL#${superAdminEmail}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: 'ROLE#SUPER_ADMIN',
      GSI2SK: `USER#${userId}`,
    };

    // Create username mapping
    const usernameItem = {
      PK: `USERNAME#${superAdminUsername}`,
      SK: 'METADATA',
      EntityType: 'UsernameMapping',
      userId,
      username: superAdminUsername,
      createdAt: now,
    };

    // Create email mapping
    const emailItem = {
      PK: `EMAIL#${superAdminEmail}`,
      SK: 'METADATA',
      EntityType: 'EmailMapping',
      userId,
      email: superAdminEmail,
      createdAt: now,
    };

    // Store all items
    await Promise.all([
      docClient.send(new PutCommand({ TableName: tableName, Item: userItem })),
      docClient.send(new PutCommand({ TableName: tableName, Item: usernameItem })),
      docClient.send(new PutCommand({ TableName: tableName, Item: emailItem })),
    ]);

    console.log('✅ Super admin user created successfully!');
    console.log('📧 Email:', superAdminEmail);
    console.log('👤 Username:', superAdminUsername);
    console.log('🔑 Password:', superAdminPassword);
    console.log('⚠️  Remember to change the password in production!');
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('ℹ️  Super admin user already exists');
    } else {
      console.error('❌ Error creating super admin:', error);
    }
  }
}

async function init() {
  await createTable();
  await seedSuperAdmin();
}

init();
