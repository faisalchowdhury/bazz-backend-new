// pushNotification.ts
import admin from "firebase-admin";
import path from "path";

import { readFileSync } from "fs";

import { INotificationPayload } from "../notification.interface";
import ApiError from "../../../errors/ApiError";
import { FIREBASE_SERVICE_ACCOUNT_PATH } from "../../../config";
import httpStatus from "http-status";

// // Read and parse the Firebase service account JSON file
// const serviceAccountBuffer = readFileSync(
//   FIREBASE_SERVICE_ACCOUNT_PATH,
//   "utf8"
// );
// const serviceAccount = JSON.parse(serviceAccountBuffer);

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

export const sendPushNotification = async (
  fcmToken: string,
  payload: INotificationPayload
): Promise<string> => {
  if (!fcmToken?.trim()) {
    throw new ApiError(httpStatus.NOT_FOUND, "No fcmtoken founded.");
  }
  const message = {
    token: fcmToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
  };
  try {
    const response = await admin.messaging().send(message);
    console.log("Push notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw new ApiError(500, "Error sending push notification");
  }
};

// export const addNotification = async (
//   fcmToken: string,
//   payload: INotificationPayload
// ): Promise<string> => {
//   // db store

//   // io emmit

//   // firbase push
//   if (!fcmToken?.trim()) {
//     throw new ApiError(httpStatus.NOT_FOUND, "No fcmtoken founded.");
//   }
//   const message = {
//     token: fcmToken,
//     notification: {
//       title: payload.title,
//       body: payload.body,
//     },
//   };
//   try {
//     const response = await admin.messaging().send(message);
//     console.log("Push notification sent successfully:", response);
//     return response;
//   } catch (error) {
//     console.error("Error sending push notification:", error);
//     throw new ApiError(500, "Error sending push notification");
//   }
// };

// Fallback helper for sending notifications to multiple tokens
export const sendPushNotificationToMultiple = async (
  tokens: string[],
  payload: INotificationPayload
): Promise<admin.messaging.BatchResponse> => {
  try {
    // Filter out invalid tokens
    const validTokens = tokens.filter((token) => !!token);
    7;
    if (validTokens.length === 0) {
      console.log("No valid tokens to send notifications to");
      return { responses: [], successCount: 0, failureCount: 0 };
    }

    // Create multicast message
    const message: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
    };

    // Send batch using Firebase optimized method
    const batchResponse = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `Notifications sent: ${batchResponse.successCount} successful, ${batchResponse.failureCount} failed`
    );

    // Optional: Log individual errors
    // batchResponse.responses.forEach((resp, idx) => {
    //   if (!resp.success) {
    //     console.error(`Failed to send to ${validTokens[idx]}:`, resp.error);
    //   }
    // });
    return batchResponse;
  } catch (error) {
    console.error("Error sending push notifications:", error);
    throw error;
  }
};
