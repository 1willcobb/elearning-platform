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
    console.log("Listing courses...");
    console.log("Table:", process.env.TABLE_NAME || "ELearningPlatform-local");
    const result = await docClient.send(
      new import_lib_dynamodb.ScanCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        FilterExpression: "EntityType = :type OR (begins_with(PK, :prefix) AND SK = :sk)",
        ExpressionAttributeValues: {
          ":type": "CourseMetadata",
          ":prefix": "COURSE#",
          ":sk": "METADATA"
        }
      })
    );
    console.log("Scan result count:", result.Count);
    console.log("Items found:", JSON.stringify(result.Items, null, 2));
    const courses = (result.Items || []).filter((item) => item.courseId).map((item) => ({
      courseId: item.courseId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail || "https://via.placeholder.com/400x200",
      instructorName: item.instructorName,
      price: item.price,
      discountPrice: item.discountPrice,
      currency: item.currency || "USD",
      category: item.category,
      level: item.level,
      totalStudents: item.totalStudents || 0,
      averageRating: item.averageRating || 0,
      totalDuration: item.totalDuration || 0,
      totalLessons: item.totalLessons || 0
    }));
    console.log("Formatted courses:", JSON.stringify(courses, null, 2));
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        courses,
        pagination: {
          total: courses.length,
          limit: 20,
          hasMore: false
        }
      })
    };
  } catch (error) {
    console.error("Error listing courses:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
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
