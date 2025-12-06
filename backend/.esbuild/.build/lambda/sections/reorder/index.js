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

// lambda/sections/reorder/index.ts
var reorder_exports = {};
__export(reorder_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(reorder_exports);
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
    const body = JSON.parse(event.body);
    const { sectionOrder } = body;
    if (!Array.isArray(sectionOrder)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "sectionOrder array is required", example: { sectionOrder: [{ sectionId: "001", order: 1 }] } })
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updatePromises = [];
    for (const item of sectionOrder) {
      const updatePromise = docClient.send(
        new import_lib_dynamodb.UpdateCommand({
          TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
          Key: { PK: `COURSE#${courseId}`, SK: `SECTION#${item.sectionId}` },
          UpdateExpression: "SET #order = :order, #updatedAt = :now, #GSI1SK = :gsi1sk",
          ExpressionAttributeNames: { "#order": "order", "#updatedAt": "updatedAt", "#GSI1SK": "GSI1SK" },
          ExpressionAttributeValues: {
            ":order": item.order,
            ":now": now,
            ":gsi1sk": `ORDER#${String(item.order).padStart(3, "0")}`
          }
        })
      );
      updatePromises.push(updatePromise);
    }
    await Promise.all(updatePromises);
    const updatedSections = await docClient.send(
      new import_lib_dynamodb.QueryCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :key",
        ExpressionAttributeValues: { ":key": `COURSE#${courseId}#SECTIONS` }
      })
    );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Sections reordered successfully",
        sections: updatedSections.Items?.sort((a, b) => a.order - b.order) || []
      })
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
