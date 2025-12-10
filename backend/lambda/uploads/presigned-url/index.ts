import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: 'http://localhost:9000',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    },
    forcePathStyle: true,
  }),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('=== UPLOAD PRESIGNED URL REQUEST ===');

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { fileName, fileType, uploadType = 'video' } = body;

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'fileName and fileType are required' }),
      };
    }

    const fileId = uuidv4();
    const fileExtension = fileName.split('.').pop();
    const key = `videos/${fileId}.${fileExtension}`;
    const bucket = uploadType === 'video' ? 'course-videos' : 'course-thumbnails';

    console.log('Generating presigned URL for:', { bucket, key, fileType });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    // Generate presigned URL with simpler signing
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600,
      signableHeaders: new Set(['host']),
      unhoistableHeaders: new Set()
    });
    
    const publicUrl = `http://localhost:9000/${bucket}/${key}`;

    console.log('Generated URLs');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        uploadUrl,
        publicUrl,
        key,
        bucket,
        fileId,
      }),
    };
  } catch (error) {
    console.error('ERROR:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
