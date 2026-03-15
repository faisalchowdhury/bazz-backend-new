import { Types } from "mongoose";

export interface IInvoice {
  userUserId: Types.ObjectId;
  trainerUserId: Types.ObjectId;
  actualPrice: number;
  adjustedPrice: number;
  issuedDate: string;
  status: string;
  invoicePath: string;
  isSent: boolean;
}
