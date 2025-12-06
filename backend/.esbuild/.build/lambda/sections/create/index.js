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

// lambda/sections/create/index.ts
var create_exports = {};
__export(create_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(create_exports);
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
    const courseId = event.pathParameters?.courseId;
    if (!courseId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "courseId is required" })
      };
    }
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Request body is required" })
      };
    }
    const course = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COURSE#${courseId}`, SK: "METADATA" }
      })
    );
    if (!course.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Course not found" })
      };
    }
    const body = JSON.parse(event.body);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existingSections = await docClient.send(
      new import_lib_dynamodb.QueryCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `COURSE#${courseId}`,
          ":sk": "SECTION#"
        }
      })
    );
    const sectionCount = existingSections.Items?.length || 0;
    const order = body.order || sectionCount + 1;
    const sectionId = String(order).padStart(3, "0");
    const sectionData = {
      PK: `COURSE#${courseId}`,
      SK: `SECTION#${sectionId}`,
      EntityType: "CourseSection",
      sectionId,
      courseId,
      title: body.title,
      description: body.description || "",
      order,
      duration: 0,
      lessonCount: 0,
      isPublished: body.isPublished || false,
      isFree: body.isFree || false,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `COURSE#${courseId}#SECTIONS`,
      GSI1SK: `ORDER#${sectionId}`
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Item: sectionData
      })
    );
    await docClient.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COURSE#${courseId}`, SK: "METADATA" },
        UpdateExpression: "SET totalSections = totalSections + :inc, updatedAt = :now",
        ExpressionAttributeValues: { ":inc": 1, ":now": now }
      })
    );
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Section created successfully", section: sectionData })
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
