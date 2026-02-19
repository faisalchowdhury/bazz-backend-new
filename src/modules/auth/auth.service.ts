import bcrypt from "bcryptjs";
import { UserModel } from "../user/user.model";
import { signToken } from "../../utils/jwt";

export const registerService = async (payload: any) => {
  const hashed = await bcrypt.hash(payload.password, 12);

  const user = (await UserModel.create({
    ...payload,
    password: hashed,
  })) as any;

  const token = signToken({ id: user._id, role: user.role }, "7d");

  return { user, token };
};

export const loginService = async (email: string, password: string) => {
  const user = await UserModel.findOne({ email }).select("+password");
  if (!user) throw new Error("User not found");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  const token = signToken({ id: user._id, role: user.role }, "7d");

  return { user, token };
};
