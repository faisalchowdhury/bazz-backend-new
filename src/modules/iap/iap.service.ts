import jwt from "jsonwebtoken";
import axios from "axios";
import { Types } from "mongoose";
import { IAPSubscriptionModel } from "./iap.model";
import { UserModel } from "../user/user.model";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

// ─────────────────────────────────────────────────────────────
// BASE64URL DECODER HELPER
// ─────────────────────────────────────────────────────────────
function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

function parseJWSPayload(jws: string): any {
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) return null;
    const payloadJson = decodeBase64Url(parts[1]);
    return JSON.parse(payloadJson);
  } catch (err) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GOOGLE OAUTH HELPER
// Generates access token using Google Service Account private key
// ─────────────────────────────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const saJsonStr = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!saJsonStr) {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON env var is missing");
  }

  let sa: any;
  try {
    sa = JSON.parse(saJsonStr);
  } catch (err) {
    // If it's a file path, we can try to read it (optional, usually stringified JSON in env is preferred)
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not a valid JSON string");
  }

  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);

  // Sign JWT claim
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };

  const token = jwt.sign(payload, sa.private_key, { algorithm: "RS256" });

  const res = await axios.post(
    tokenUri,
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return res.data.access_token;
}

// ─────────────────────────────────────────────────────────────
// IAP VERIFICATION SERVICE
// ─────────────────────────────────────────────────────────────
export const verifyIAPSubscription = async (
  userId: string,
  platform: "ios" | "android",
  productId: "month_1" | "year_1" | string,
  purchaseId: string,
  verificationData: string
) => {
  // 1. Check Product ID mapping
  if (productId !== "month_1" && productId !== "year_1") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Unknown productId");
  }
  const subscriptionTier: "monthly" | "annual" =
    productId === "month_1" ? "monthly" : "annual";

  // 2. IDEMPOTENCY CHECK
  const existingSubscription = await IAPSubscriptionModel.findOne({ purchaseId });
  if (existingSubscription) {
    if (existingSubscription.userId.toString() !== userId) {
      // Linked to another account!
      throw new ApiError(
        httpStatus.CONFLICT,
        "This purchase already linked to another user account"
      );
    }
    // Return existing active subscription details
    return {
      isSubscribed: existingSubscription.status === "active",
      subscriptionTier: existingSubscription.subscriptionTier,
      subscriptionStartDate: existingSubscription.startDate,
      subscriptionEndDate: existingSubscription.endDate,
      status: existingSubscription.status,
      platform: existingSubscription.platform,
      productId: existingSubscription.productId,
    };
  }

  let startDate = new Date();
  let endDate = new Date();
  let originalTransactionId = undefined;

  // 3. STORE VERIFICATION
  if (platform === "ios") {
    const payload = parseJWSPayload(verificationData);

    if (payload) {
      // Validate Bundle ID
      if (payload.bundleId !== "com.p2pfittech.ai") {
        throw new ApiError(httpStatus.PAYMENT_REQUIRED, "Invalid bundle id in JWS transaction");
      }
      // Validate Product ID matches
      if (payload.productId !== productId) {
        throw new ApiError(httpStatus.PAYMENT_REQUIRED, "Product ID mismatch in JWS transaction");
      }

      startDate = payload.purchaseDate ? new Date(payload.purchaseDate) : new Date();
      endDate = payload.expiresDate ? new Date(payload.expiresDate) : new Date();
      originalTransactionId = payload.originalTransactionId || payload.transactionId;

      // Ensure not expired
      if (endDate.getTime() <= Date.now()) {
        throw new ApiError(httpStatus.PAYMENT_REQUIRED, "Purchase invalid or expired");
      }
    } else {
      // If verificationData is a sandbox/test token or mock key
      if (
        verificationData === "sandbox-mock-passed" ||
        process.env.NODE_ENV === "test" ||
        process.env.NODE_ENV === "development"
      ) {
        // Fallback mock for local / testing modes
        console.log("⚠️ iOS Offline/Sandbox mock fallback activated.");
        startDate = new Date();
        endDate = new Date();
        if (productId === "month_1") {
          endDate.setDate(endDate.getDate() + 30);
        } else {
          endDate.setDate(endDate.getDate() + 365);
        }
        originalTransactionId = "orig_" + purchaseId;
      } else {
        throw new ApiError(httpStatus.PAYMENT_REQUIRED, "purchase invalid or expired");
      }
    }

    // Additional originalTransactionId uniqueness check
    if (originalTransactionId) {
      const existingOrig = await IAPSubscriptionModel.findOne({ originalTransactionId });
      if (existingOrig) {
        if (existingOrig.userId.toString() !== userId) {
          throw new ApiError(
            httpStatus.CONFLICT,
            "This purchase already linked to another user account"
          );
        }
        // If same user, idempotent success
        return {
          isSubscribed: existingOrig.status === "active",
          subscriptionTier: existingOrig.subscriptionTier,
          subscriptionStartDate: existingOrig.startDate,
          subscriptionEndDate: existingOrig.endDate,
          status: existingOrig.status,
          platform: existingOrig.platform,
          productId: existingOrig.productId,
        };
      }
    }

  } else if (platform === "android") {
    // Verify with Google Play Developer API
    if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
      try {
        const accessToken = await getGoogleAccessToken();
        const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.p2pfittech.ai/purchases/subscriptionsv2/tokens/${verificationData}`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = res.data;

        // Check if active
        if (data.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE") {
          throw new ApiError(httpStatus.PAYMENT_REQUIRED, "purchase invalid or expired");
        }

        startDate = data.startTime ? new Date(data.startTime) : new Date();
        endDate = data.expireTime ? new Date(data.expireTime) : new Date();

        if (endDate.getTime() <= Date.now()) {
          throw new ApiError(httpStatus.PAYMENT_REQUIRED, "purchase invalid or expired");
        }
      } catch (err: any) {
        console.error("Google Play Verification error:", err.message);
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Google Play store API error: " + err.message
        );
      }
    } else {
      // Mock mode fallback for local sandbox / test suite
      if (
        verificationData === "sandbox-mock-passed" ||
        process.env.NODE_ENV === "test" ||
        process.env.NODE_ENV === "development"
      ) {
        console.log("⚠️ Android Offline/Sandbox mock fallback activated.");
        startDate = new Date();
        endDate = new Date();
        if (productId === "month_1") {
          endDate.setDate(endDate.getDate() + 30);
        } else {
          endDate.setDate(endDate.getDate() + 365);
        }
      } else {
        throw new ApiError(httpStatus.PAYMENT_REQUIRED, "purchase invalid or expired");
      }
    }
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid platform");
  }

  // 4. Create and Save IAP Subscription Record
  const subscription = await IAPSubscriptionModel.create({
    userId: new Types.ObjectId(userId),
    platform,
    productId,
    subscriptionTier,
    purchaseId,
    originalTransactionId,
    purchaseToken: platform === "android" ? verificationData : undefined,
    status: "active",
    startDate,
    endDate,
  });

  // 5. Update User Document
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      subscriptionTier,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      subscribedTrainer: null, // Clear personal trainer selection as default AI trainer is used
    },
  });

  return {
    isSubscribed: true,
    subscriptionTier,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    status: "active",
    platform,
    productId,
  };
};
