import httpStatus from "http-status";
import ApiError from "../errors/ApiError";

export const validateUserLockStatus = async (user: any) => {
  if (user?.blockStatus === null || user?.blockStatus <= new Date()) {
    return true;
  } else {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Your account is temporarily blocked"
    );
  }
};
