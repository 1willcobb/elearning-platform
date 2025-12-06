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

// lambda/users/create-profile/index.ts
var create_profile_exports = {};
__export(create_profile_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(create_profile_exports);
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
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const userId = body.userId || `user${Date.now()}`;
    const existing = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `USER#${userId}`, SK: "PROFILE" }
      })
    );
    if (existing.Item) {
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Profile already exists" })
      };
    }
    const profileData = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      EntityType: "UserProfile",
      userId,
      email: body.email,
      name: body.name,
      avatar: body.avatar || null,
      role: body.role || "STUDENT",
      bio: body.bio || "",
      website: body.website || "",
      socialLinks: body.socialLinks || {},
      createdAt: now,
      updatedAt: now,
      isActive: true,
      isEmailVerified: body.isEmailVerified || false,
      GSI1PK: `EMAIL#${body.email}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `ROLE#${body.role || "STUDENT"}`,
      GSI2SK: `USER#${userId}`
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Item: profileData
      })
    );
    const settingsData = {
      PK: `USER#${userId}`,
      SK: "SETTINGS",
      EntityType: "UserSettings",
      notifications: {
        email: true,
        push: true,
        courseUpdates: true,
        newCourses: false
      },
      privacy: {
        showProfile: true,
        showProgress: false
      },
      preferences: {
        language: "en",
        theme: "light",
        videoQuality: "auto",
        playbackSpeed: 1
      },
      updatedAt: now
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Item: settingsData
      })
    );
    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "User profile created successfully",
        profile: profileData,
        settings: settingsData
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
