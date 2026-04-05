import { Types } from "mongoose";
import { TrainerRequestModel } from "./trainerRequest.model";
import { TrainerModel } from "../trainer/trainer.model";
import { UserModel } from "../user/user.model";
import { ITrainerRequest } from "./trainerRequest.interface";

// ─────────────────────────────────────────────────────────────
// SEND REQUEST
// User sends a request to a trainer with a note
// Rules:
//   - User can only have ONE active request at a time
//   - Cannot send to same trainer if already pending/accepted
// ─────────────────────────────────────────────────────────────

export const sendTrainerRequest = async (
  userId: string,
  trainerId: string,
  note: string,
) => {
  // 1. Verify trainer exists
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  // 2. Check user does not already have an active request
  const existingRequest = await TrainerRequestModel.findOne({
    userId,
    status: { $in: ["pending", "accepted"] },
  });
  if (existingRequest) {
    throw new Error(
      "You already have an active request. Cancel it before sending a new one.",
    );
  }

  // 3. Create request
  const request = await TrainerRequestModel.create({
    userId,
    trainerId,
    note,
    status: "pending",
  });

  return request;
};

// ─────────────────────────────────────────────────────────────
// GET MY REQUEST (user sees their own request)
// ─────────────────────────────────────────────────────────────

export const getMyRequest = async (userId: string) => {
  return await TrainerRequestModel.findOne({
    userId,
    status: { $in: ["pending", "accepted"] },
  })
    .populate("trainerId", "name specialty profileImage")
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET ALL MY REQUESTS HISTORY (user)
// ─────────────────────────────────────────────────────────────

export const getMyRequestHistory = async (userId: string) => {
  return await TrainerRequestModel.find({ userId })
    .populate("trainerId", "name specialty profileImage")
    .sort({ createdAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────
// CANCEL REQUEST (user cancels their pending request)
// ─────────────────────────────────────────────────────────────

export const cancelRequest = async (userId: string, requestId: string) => {
  const request = await TrainerRequestModel.findOne({
    _id: requestId,
    userId,
  });
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be cancelled");
  }

  request.status = "cancelled";
  request.cancelledAt = new Date();
  await request.save();

  return request;
};

// ─────────────────────────────────────────────────────────────
// GET INCOMING REQUESTS (trainer sees pending requests)
// ─────────────────────────────────────────────────────────────

export const getIncomingRequests = async (
  trainerId: string,
  status?: string,
) => {
  const query: any = { trainerId };
  if (status) query.status = status;
  else query.status = "pending"; // default: show only pending

  return await TrainerRequestModel.find(query)
    .populate(
      "userId",
      "firstName lastName email profilePicture primaryGoal fitnessLevel",
    )
    .sort({ createdAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────
// ACCEPT REQUEST (trainer accepts)
// ─────────────────────────────────────────────────────────────

export const acceptRequest = async (trainerId: string, requestId: string) => {
  const request = await TrainerRequestModel.findOne({
    _id: requestId,
    trainerId,
  });
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be accepted");
  }

  request.status = "accepted";
  request.acceptedAt = new Date();
  await request.save();

  return request.populate("userId", "firstName lastName email");
};

// ─────────────────────────────────────────────────────────────
// REJECT REQUEST (trainer rejects with optional reason)
// ─────────────────────────────────────────────────────────────

export const rejectRequest = async (
  trainerId: string,
  requestId: string,
  rejectionReason?: string,
) => {
  const request = await TrainerRequestModel.findOne({
    _id: requestId,
    trainerId,
  });
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be rejected");
  }

  request.status = "rejected";
  request.rejectionReason = rejectionReason;
  request.rejectedAt = new Date();
  await request.save();

  return request;
};
