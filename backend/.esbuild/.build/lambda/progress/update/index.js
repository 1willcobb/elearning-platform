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

// lambda/progress/update/index.ts
var update_exports = {};
__export(update_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(update_exports);
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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Request body is required" })
      };
    }
    const body = JSON.parse(event.body);
    const { courseId, lessonId, watchTime, completed } = body;
    const userId = "user123";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const progressData = {
      PK: `USER#${userId}`,
      SK: `PROGRESS#${courseId}#lesson${lessonId}`,
      EntityType: "LessonProgress",
      userId,
      courseId,
      lessonId,
      status: completed ? "COMPLETED" : "IN_PROGRESS",
      watchTime,
      completedAt: completed ? now : null,
      lastAccessedAt: now,
      GSI1PK: `USER#${userId}#COURSE#${courseId}`,
      GSI1SK: `PROGRESS#${lessonId}`
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Item: progressData
      })
    );
    if (completed) {
      const enrollment = await docClient.send(
        new import_lib_dynamodb.GetCommand({
          TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
          Key: { PK: `USER#${userId}`, SK: `ENROLLMENT#${courseId}` }
        })
      );
      if (enrollment.Item) {
        const completedLessons = (enrollment.Item.progress?.completedLessons || 0) + 1;
        const totalLessons = enrollment.Item.progress?.totalLessons || 1;
        const completionPercentage = Math.round(completedLessons / totalLessons * 100);
        await docClient.send(
          new import_lib_dynamodb.UpdateCommand({
            TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
            Key: { PK: `USER#${userId}`, SK: `ENROLLMENT#${courseId}` },
            UpdateExpression: "SET progress.completedLessons = :completed, progress.completionPercentage = :percentage, lastAccessedAt = :now",
            ExpressionAttributeValues: {
              ":completed": completedLessons,
              ":percentage": completionPercentage,
              ":now": now
            }
          })
        );
      }
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Progress updated", progress: progressData })
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
