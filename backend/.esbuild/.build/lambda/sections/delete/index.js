"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambda/sections/delete/index.ts
var delete_exports = {};
__export(delete_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(delete_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var dynamoClient = new import_client_dynamodb.DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...process.env.STAGE === "local" && {
    endpoint: "http://localhost:8000",
    credentials: { accessKeyId: "local", secretAccessKey: "local" }
  }
});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(dynamoClient);
var handler = async (event) => {
  try {
    const { courseId, sectionId } = event.pathParameters || {};
    if (!courseId || !sectionId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "courseId and sectionId are required" })
      };
    }
    const section = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COURSE#${courseId}`, SK: `SECTION#${sectionId}` }
      })
    );
    if (!section.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Section not found" })
      };
    }
    const lessons = await docClient.send(
      new import_lib_dynamodb.QueryCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :key",
        ExpressionAttributeValues: { ":key": `COURSE#${courseId}#SECTION#${sectionId}` }
      })
    );
    const items = lessons.Items || [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      await docClient.send(
        new import_lib_dynamodb.BatchWriteCommand({
          RequestItems: {
            [process.env.TABLE_NAME || "ELearningPlatform-local"]: batch.map((item) => ({
              DeleteRequest: { Key: { PK: item.PK, SK: item.SK } }
            }))
          }
        })
      );
    }
    await docClient.send(
      new import_lib_dynamodb.DeleteCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COURSE#${courseId}`, SK: `SECTION#${sectionId}` }
      })
    );
    await docClient.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COURSE#${courseId}`, SK: "METADATA" },
        UpdateExpression: "SET totalSections = totalSections - :dec, totalLessons = totalLessons - :lessonDec",
        ExpressionAttributeValues: { ":dec": 1, ":lessonDec": items.length }
      })
    );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Section and all lessons deleted successfully", deletedLessons: items.length })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=index.js.map
