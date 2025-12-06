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

// lambda/courses/list/index.ts
var list_exports = {};
__export(list_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(list_exports);
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
    console.log("Event:", JSON.stringify(event, null, 2));
    const { category, limit = "20", lastKey } = event.queryStringParameters || {};
    const response = {
      courses: [
        {
          courseId: "course-1",
          title: "Test Course 1",
          description: "This is a test course",
          instructor: "Test Instructor",
          price: 99.99,
          thumbnail: "https://via.placeholder.com/400x300"
        },
        {
          courseId: "course-2",
          title: "Test Course 2",
          description: "Another test course",
          instructor: "Test Instructor",
          price: 49.99,
          thumbnail: "https://via.placeholder.com/400x300"
        }
      ],
      pagination: {
        total: 2,
        limit: parseInt(limit),
        hasMore: false
      }
    };
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
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
