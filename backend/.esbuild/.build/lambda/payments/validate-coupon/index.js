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

// lambda/payments/validate-coupon/index.ts
var validate_coupon_exports = {};
__export(validate_coupon_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(validate_coupon_exports);
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
    const couponCode = event.pathParameters?.couponCode?.toUpperCase();
    const { courseId, amount } = event.queryStringParameters || {};
    if (!couponCode) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Coupon code is required" })
      };
    }
    const coupon = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Key: { PK: `COUPON#${couponCode}`, SK: "METADATA" }
      })
    );
    if (!coupon.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ valid: false, error: "Coupon not found" })
      };
    }
    const now = /* @__PURE__ */ new Date();
    const validFrom = new Date(coupon.Item.validFrom);
    const validUntil = new Date(coupon.Item.validUntil);
    const validations = {
      isActive: coupon.Item.isActive,
      isNotExpired: now >= validFrom && now <= validUntil,
      hasUsesRemaining: coupon.Item.usedCount < coupon.Item.maxUses,
      meetsMinimum: !amount || parseFloat(amount) >= coupon.Item.minPurchaseAmount,
      applicableToCourse: true
      // TODO: Check if applicable to specific course
    };
    const isValid = Object.values(validations).every((v) => v === true);
    let discountAmount = 0;
    if (isValid && amount) {
      const purchaseAmount = parseFloat(amount);
      if (coupon.Item.type === "PERCENTAGE") {
        discountAmount = purchaseAmount * coupon.Item.discountValue / 100;
      } else {
        discountAmount = coupon.Item.discountValue;
      }
      if (coupon.Item.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.Item.maxDiscountAmount);
      }
    }
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        valid: isValid,
        coupon: isValid ? {
          code: coupon.Item.couponCode,
          type: coupon.Item.type,
          discountValue: coupon.Item.discountValue,
          discountAmount,
          validUntil: coupon.Item.validUntil
        } : null,
        validations
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
