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

// lambda/payments/create-coupon/index.ts
var create_coupon_exports = {};
__export(create_coupon_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(create_coupon_exports);
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
    const couponCode = body.couponCode.toUpperCase();
    const existing = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COUPON#${couponCode}`, SK: "METADATA" }
      })
    );
    if (existing.Item) {
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Coupon code already exists" })
      };
    }
    const couponData = {
      PK: `COUPON#${couponCode}`,
      SK: "METADATA",
      EntityType: "Coupon",
      couponCode,
      type: body.type,
      // PERCENTAGE | FIXED_AMOUNT
      discountValue: body.discountValue,
      applicableTo: body.applicableTo || "ALL",
      // ALL | SPECIFIC_COURSES | CATEGORY
      specificCourses: body.specificCourses || null,
      category: body.category || null,
      maxUses: body.maxUses || 1e3,
      usedCount: 0,
      minPurchaseAmount: body.minPurchaseAmount || 0,
      maxDiscountAmount: body.maxDiscountAmount || null,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      isActive: true,
      createdBy: "ADMIN#admin123",
      // TODO: Get from JWT
      createdAt: now
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Item: couponData
      })
    );
    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Coupon created successfully",
        coupon: couponData
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
