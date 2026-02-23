import { Types } from "mongoose";

interface certificates {
  name: string;
  institute: string;
  type: string;
  certificateId: string;
}

export interface ITrainer {
  userId: Types.ObjectId;
  texDocument: string;
  specialties: string[];
  certificates: certificates[];
  availability: string[];
  experience: number; // years of experience in number
}
