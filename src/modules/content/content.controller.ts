import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  createContentService,
  getMyVideosService,
  getVideoService,
} from "./content.service";

export const createContent = catchAsync(async (req: Request, res: Response) => {
  const createContent = await createContentService(req);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Content created sussessfully",
    data: createContent,
  });
});

export const getMyVideos = catchAsync(async (req: Request, res: Response) => {
  const getMyVideos = await getMyVideosService(req);
  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My content fetched successfully",
    data: getMyVideos,
  });
});
export const getvideo = catchAsync(async (req: Request, res: Response) => {
  const getMyVideos = await getVideoService(req);
  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My content fetched successfully",
    data: getMyVideos,
  });
});
