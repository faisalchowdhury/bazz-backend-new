import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";

import mongoose from "mongoose";

import { UserModel } from "../modules/user/user.model"; // User model

import { NotificationModel } from "../modules/notifications/notification.model";
import { INotification } from "../modules/notifications/notification.interface";

import express, { Application, NextFunction, Request, Response } from "express";

import { verifySocketToken } from "./JwtToken";
import ApiError from "../errors/ApiError";
import httpStatus from "http-status";
const app: Application = express();

declare module "socket.io" {
  interface Socket {
    user?: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

// Initialize the Socket.IO server
let io: SocketIOServer;
export const connectedUsers = new Map<string, { socketID: string }>();
export const connectedClients = new Map<string, Socket>();
const sendResponse = (
  statusCode: number,
  status: string,
  message: string,
  data?: any
) => ({
  statusCode,
  status,
  message,
  data,
});

export const initSocketIO = async (server: HttpServer): Promise<void> => {
  console.log("🔧 Initializing Socket.IO server 🔧");

  const { Server } = await import("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*", // Replace with your client's origin
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"], // Add any custom headers if needed
      credentials: true,
    },
  });

  console.log("🎉 Socket.IO server initialized! 🎉");

  // Authentication middleware: now takes the token from headers.
  io.use(async (socket: Socket, next: (err?: any) => void) => {
    // Extract token from headers (ensure your client sends it in headers)
    const token =
      (socket.handshake.auth.token as string) ||
      (socket.handshake.headers.token as string);

    if (!token) {
      return next(
        new ApiError(
          httpStatus.UNAUTHORIZED,
          "Authentication error: Token missing"
        )
      );
    }

    const userDetails = verifySocketToken(token);
    if (!userDetails) {
      return next(new Error("Authentication error: Invalid token"));
    }

    const user = await UserModel.findById(userDetails.id);
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.user = user as any;
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log("Socket just connected:", {
      socketId: socket.id,
      userId: socket.user?._id,
      name: socket.user?.name,
      email: socket.user?.email,
      role: socket.user?.role,
    });

    // Automatically register the connected user to avoid missing the "userConnected" event.
    if (socket.user && socket.user._id) {
      connectedUsers.set(socket.user._id.toString(), { socketID: socket.id });
      console.log(
        `Registered user ${socket.user._id.toString()} with socket ID: ${socket.id}`
      );
    }

    // (Optional) In addition to auto-registering, you can still listen for a "userConnected" event if needed.
    socket.on("userConnected", ({ userId }: { userId: string }) => {
      connectedUsers.set(userId, { socketID: socket.id });
      console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log(
        `${socket.user?.name} || ${socket.user?.email} || ${socket.user?._id} just disconnected with socket ID: ${socket.id}`
      );

      // Remove user from connectedUsers map
      for (const [key, value] of connectedUsers.entries()) {
        if (value.socketID === socket.id) {
          connectedUsers.delete(key);
          break;
        }
      }
    });
  });
};

// Export the Socket.IO instance
export { io };

export const emitNotification = async ({
  userId,
  adminMsgTittle,
  userMsgTittle,
  userMsg,
  adminMsg,
}: {
  userId: mongoose.Types.ObjectId;
  userMsgTittle: string;
  adminMsgTittle: string;
  userMsg?: string;
  adminMsg?: string;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  // Get the socket ID of the specific user
  const userSocket = connectedUsers.get(userId.toString());

  // Get admin IDs
  const admins = (await UserModel.find({ role: "admin" }).select("_id")) as any;
  const adminIds = admins.map((admin: any) => admin._id.toString());

  // Notify the specific user
  if (userMsg && userSocket) {
    io.to(userSocket.socketID).emit(`notification`, {
      userId,
      message: userMsg,
    });
  }

  // Notify all admins
  if (adminMsg) {
    adminIds.forEach((adminId: any) => {
      const adminSocket = connectedUsers.get(adminId);
      if (adminSocket) {
        io.to(adminSocket.socketID).emit(`notification`, {
          adminId,
          message: adminMsg,
        });
      }
    });
  }

  // Save notification to the database
  await NotificationModel.create<INotification>({
    userId,
    userMsg,
    adminId: adminIds,
    adminMsg,
    adminMsgTittle,
    userMsgTittle,
  });
};
