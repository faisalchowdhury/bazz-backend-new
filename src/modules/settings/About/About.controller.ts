import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import sendError from "../../../utils/sendError";

import sendResponse from "../../../utils/sendResponse";
import { findUserById } from "../../user/user.utils";
import catchAsync from "../../../utils/catchAsync";

import sanitizeHtml from "sanitize-html";
import { JWT_SECRET_KEY } from "../../../config";
import { Request, Response } from "express";
import {
  createAboutInDB,
  getAllAboutFromDB,
  updateAboutInDB,
} from "./About.service";
import { verifyToken } from "../../../utils/JwtToken";
import { sanitizeOptions } from "../../../utils/SanitizeOptions";



export const createAbout = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error);
  }
  const userId = decoded.id as string; // Assuming the token contains the userId

  // Find the user by userId
  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, {
      statusCode: httpStatus.NOT_FOUND,
      message: "User not found.",
    });
  }

  const { description } = req.body;
  const sanitizedContent = sanitizeHtml(description, sanitizeOptions);
  if (!description) {
    return sendError(res, {
      statusCode: httpStatus.BAD_REQUEST,
      message: "Description is required!",
    });
  }

  const result = await createAboutInDB({ sanitizedContent });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "About created successfully.",
    data: result,
  });
});

export const getAllAbout = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllAboutFromDB();
  const responseData = result[0];

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "About retrieved successfully.",
    data: responseData,
  });
});

export const updateAbout = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error);
  }
  const userId = decoded.id as string; // Assuming the token contains the userId

  // Find the user by userId
  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, {
      statusCode: httpStatus.NOT_FOUND,
      message: "User not found.",
    });
  }

  // Sanitize the description field
  const { description } = req.body;

  if (!description) {
    return sendError(res, {
      statusCode: httpStatus.BAD_REQUEST,
      message: "Description is required.",
    });
  }

  const sanitizedDescription = sanitizeHtml(description, sanitizeOptions);

  // Assume you're updating the terms based on the sanitized description
  const result = await updateAboutInDB(sanitizedDescription);

  if (!result) {
    return sendError(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Failed to update terms.",
    });
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "About updated successfully.",
    data: result,
  });
});
