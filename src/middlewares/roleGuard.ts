import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../errors/ApiError";
import { TRole } from "../config/role";
import { UserModel } from "../modules/user/user.model";
import sendResponse from "../utils/sendResponse";

export interface IUserPayload extends jwt.JwtPayload {
  id: string;
  role: string;
  email: string;
}

export const guardRole = (roles: TRole | TRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "No token provided",
        data: null,
      });
      // throw new ApiError(401, "Access denied. No token provided.");
    }

    try {
      // Decode token and cast it to IUserPayload
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET_KEY as string
      ) as IUserPayload;
      // Attach the decoded payload to the request object
      (req as any).user = decoded;
      const userRole = decoded.role;
      // Check if the user has one of the allowed roles
      if (
        (Array.isArray(roles) && roles.includes(userRole as TRole)) ||
        roles === userRole
      ) {
        console.log(decoded);
        const user = (await UserModel.findOne({ _id: decoded.id })) as any;
        if (!user.isVerified) {
          return sendResponse(res, {
            statusCode: 400,
            success: false,
            message: "User is not verified ",
            data: null,
          });
        }

        return next();
      }

      throw new ApiError(
        403,
        "You are not authorized to access this resource."
      );
    } catch (error) {
      // throw new ApiError(498, "Session Expired");

      return sendResponse(res, {
        statusCode: 498,
        success: false,
        message: "Session expired",
        data: null,
      });
    }
  };
};
