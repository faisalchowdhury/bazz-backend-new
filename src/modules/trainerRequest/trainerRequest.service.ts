import { TrainerRequestModel } from "./trainerRequest.model";
import { TrainerModel } from "../trainer/trainer.model";
import { UserModel } from "../user/user.model";
import { InvoiceModel } from "../invoice/invoice.model";
import paginationBuilder from "../../utils/paginationBuilder";
import {
  TRAINER_VIEW_USER_SELECT,
  formatUserForTrainerView,
} from "../user/user.serializer";
import { sendAppNotification } from "../notifications/notification.helper";

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

  // 4. Send notification to trainer
  const senderUser = await UserModel.findById(userId).select("firstName lastName");
  if (senderUser && trainer.userId) {
    await sendAppNotification({
      userId: trainer.userId,
      title: "New Incoming Request 📩",
      message: `${senderUser.firstName} ${senderUser.lastName} sent you a trainer request.`,
    });
  }

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
// GET TRAINER REQUESTS (shared list logic)
// ─────────────────────────────────────────────────────────────

const getTrainerRequestsList = async (
  trainerId: string,
  filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  options: { defaultStatus?: string; fullUserProfile?: boolean } = {},
) => {
  const query: Record<string, unknown> = { trainerId };

  if (filters.status) {
    query.status = filters.status;
  } else if (options.defaultStatus) {
    query.status = options.defaultStatus;
  }

  const search = filters.search?.trim();
  if (search) {
    const searchRegex = new RegExp(search, "i");
    const matchingUsers = await UserModel.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: search,
              options: "i",
            },
          },
        },
      ],
    }).select("_id");

    query.userId = { $in: matchingUsers.map((user) => user._id) };
  }

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const userPopulate = options.fullUserProfile
    ? { path: "userId", select: TRAINER_VIEW_USER_SELECT }
    : {
        path: "userId",
        select:
          "firstName lastName email profilePicture primaryGoal fitnessLevel",
      };

  const [data, totalData] = await Promise.all([
    TrainerRequestModel.find(query)
      .populate(userPopulate)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TrainerRequestModel.countDocuments(query),
  ]);

  const pagination = paginationBuilder({ totalData, currentPage: page, limit });

  return { data, pagination };
};

export const getIncomingRequests = async (
  trainerId: string,
  filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => getTrainerRequestsList(trainerId, filters, { defaultStatus: "pending" });

export const getAllTrainerRequests = async (
  trainerId: string,
  filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { data, pagination } = await getTrainerRequestsList(trainerId, filters, {
    fullUserProfile: true,
  });

  const requestIds = data.map((request) => request._id);
  const invoices = await InvoiceModel.find({
    trainerId,
    requestId: { $in: requestIds },
  })
    .select("requestId status createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const invoiceStatusByRequestId = new Map<string, string>();
  for (const invoice of invoices) {
    const requestId = invoice.requestId.toString();
    if (!invoiceStatusByRequestId.has(requestId)) {
      invoiceStatusByRequestId.set(requestId, invoice.status);
    }
  }

  const enrichedData = data.map((request) => ({
    ...request,
    userId: formatUserForTrainerView(
      request.userId as unknown as Record<string, unknown>,
    ),
    invoiceStatus: invoiceStatusByRequestId.get(request._id.toString()) || "",
  }));

  return { data: enrichedData, pagination };
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

  // Send notification to the user that request is accepted
  const trainer = await TrainerModel.findById(trainerId).select("name");
  if (trainer) {
    await sendAppNotification({
      userId: request.userId,
      title: "Request Accepted! 🎉",
      message: `${trainer.name} has accepted your training request!`,
    });
  }

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
