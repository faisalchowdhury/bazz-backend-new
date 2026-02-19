import jwt, { JwtPayload } from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { UserModel } from "../modules/user/user.model";

// extend JwtPayload so TS knows your token has these fields
export interface JwtPayloadWithUser extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

export const userVerification = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error("JWT secret key is not defined in environment variables");
    }
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as string
    );

    const user = await UserModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default userVerification;
