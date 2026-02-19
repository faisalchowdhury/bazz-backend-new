import * as jwt from "jsonwebtoken";

export const signToken = (
  payload: object,
  expiresIn?: jwt.SignOptions["expiresIn"]
) => {
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, { expiresIn });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as jwt.Secret);
};
