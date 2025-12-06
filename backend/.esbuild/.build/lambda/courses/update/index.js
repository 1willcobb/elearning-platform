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

// lambda/courses/update/index.ts
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
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local"
    }
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
    const existingCourse = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: {
          PK: `COURSE#${courseId}`,
          SK: "METADATA"
        }
      })
    );
    if (!existingCourse.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Course not found" })
      };
    }
    const body = JSON.parse(event.body);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const allowedFields = [
      "title",
      "description",
      "longDescription",
      "category",
      "subcategory",
      "tags",
      "level",
      "language",
      "price",
      "currency",
      "discountPrice",
      "discountEndDate",
      "thumbnail",
      "previewVideo",
      "requirements",
      "learningOutcomes",
      "targetAudience",
      "status",
      "isPublished"
    ];
    allowedFields.forEach((field) => {
      if (body[field] !== void 0) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });
    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No valid fields to update" })
      };
    }
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = now;
    if (body.category) {
      updateExpressions.push("#GSI1PK = :GSI1PK");
      expressionAttributeNames["#GSI1PK"] = "GSI1PK";
      expressionAttributeValues[":GSI1PK"] = `CATEGORY#${body.category}`;
    }
    if (body.status) {
      updateExpressions.push("#GSI3PK = :GSI3PK");
      expressionAttributeNames["#GSI3PK"] = "GSI3PK";
      expressionAttributeValues[":GSI3PK"] = `STATUS#${body.status}`;
    }
    const result = await docClient.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: {
          PK: `COURSE#${courseId}`,
          SK: "METADATA"
        },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW"
      })
    );
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Course updated successfully",
        course: result.Attributes
      })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=index.js.map
