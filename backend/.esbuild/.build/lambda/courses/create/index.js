"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambda/courses/create/index.ts
var create_exports = {};
__export(create_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(create_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");

// node_modules/uuid/dist/esm-node/rng.js
var import_crypto = __toESM(require("crypto"));
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    import_crypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

// node_modules/uuid/dist/esm-node/native.js
var import_crypto2 = __toESM(require("crypto"));
var native_default = {
  randomUUID: import_crypto2.default.randomUUID
};

// node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// lambda/courses/create/index.ts
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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Request body is required" })
      };
    }
    const body = JSON.parse(event.body);
    const courseId = v4_default();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const instructorId = "USER#instructor789";
    const courseData = {
      PK: `COURSE#${courseId}`,
      SK: "METADATA",
      EntityType: "CourseMetadata",
      courseId,
      title: body.title,
      slug: body.title.toLowerCase().replace(/\s+/g, "-"),
      description: body.description || "",
      longDescription: body.longDescription || "",
      instructorId,
      instructorName: body.instructorName || "Instructor",
      category: body.category || "Uncategorized",
      subcategory: body.subcategory || "",
      tags: body.tags || [],
      level: body.level || "BEGINNER",
      language: body.language || "English",
      price: body.price || 0,
      currency: body.currency || "USD",
      status: "DRAFT",
      isPublished: false,
      totalDuration: 0,
      totalLessons: 0,
      totalSections: 0,
      totalStudents: 0,
      totalReviews: 0,
      averageRating: 0,
      createdAt: now,
      updatedAt: now,
      // GSI indexes
      GSI1PK: `CATEGORY#${body.category || "Uncategorized"}`,
      GSI1SK: `RATING#0#COURSE#${courseId}`,
      GSI2PK: instructorId,
      GSI2SK: `COURSE#${courseId}`,
      GSI3PK: "STATUS#DRAFT",
      GSI3SK: `DATE#${now}#COURSE#${courseId}`
    };
    await docClient.send(
      new import_lib_dynamodb.PutCommand({
        TableName: process.env.TABLE_NAME || "ELearningPlatform-local",
        Item: courseData
      })
    );
    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Course created successfully",
        course: courseData
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
