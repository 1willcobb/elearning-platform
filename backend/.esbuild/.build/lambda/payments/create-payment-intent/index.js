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

// lambda/payments/create-payment-intent/index.ts
var create_payment_intent_exports = {};
__export(create_payment_intent_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(create_payment_intent_exports);
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
    const { courseId, couponCode } = body;
    const userId = "user123";
    if (!courseId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "courseId is required" })
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
    let finalPrice = course.Item.discountPrice || course.Item.price;
    let discountApplied = 0;
    let couponData = null;
    if (couponCode) {
      const coupon = await docClient.send(
        new import_lib_dynamodb.GetCommand({
          TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
          Key: { PK: `COUPON#${couponCode}`, SK: "METADATA" }
        })
      );
      if (coupon.Item && coupon.Item.isActive) {
        const now = /* @__PURE__ */ new Date();
        const validFrom = new Date(coupon.Item.validFrom);
        const validUntil = new Date(coupon.Item.validUntil);
        if (now >= validFrom && now <= validUntil && coupon.Item.usedCount < coupon.Item.maxUses) {
          couponData = coupon.Item;
          if (coupon.Item.type === "PERCENTAGE") {
            discountApplied = finalPrice * coupon.Item.discountValue / 100;
          } else {
            discountApplied = coupon.Item.discountValue;
          }
          if (coupon.Item.maxDiscountAmount) {
            discountApplied = Math.min(discountApplied, coupon.Item.maxDiscountAmount);
          }
          finalPrice = Math.max(0, finalPrice - discountApplied);
        }
      }
    }
    const paymentIntent = {
      id: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret`,
      amount: Math.round(finalPrice * 100),
      // Convert to cents
      currency: course.Item.currency.toLowerCase(),
      status: "requires_payment_method"
    };
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        paymentIntent,
        course: {
          id: courseId,
          title: course.Item.title,
          originalPrice: course.Item.price,
          discountPrice: course.Item.discountPrice,
          finalPrice,
          discountApplied,
          couponApplied: couponData?.couponCode || null
        }
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
