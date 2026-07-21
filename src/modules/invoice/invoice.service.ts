import { Types } from "mongoose";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { InvoiceModel } from "./invoice.model";

import { TrainerModel } from "../trainer/trainer.model";
import { UserModel } from "../user/user.model";
import { IInvoice } from "./invoice.interface";
import { TrainerRequestModel } from "../trainerRequest/trainerRequest.model";
import { SubscriptionModel } from "../subscription/subscription.model";
import paginationBuilder from "../../utils/paginationBuilder";
import {
  TRAINER_VIEW_USER_SELECT,
  formatUserForTrainerView,
} from "../user/user.serializer";
import stripe from "../../utils/stripe";
import { sendInvoiceEmail } from "../user/user.utils";

// ─────────────────────────────────────────────────────────────
// HELPER — GENERATE INVOICE NUMBER
// Format: INV-2026-0042
// ─────────────────────────────────────────────────────────────

const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await InvoiceModel.countDocuments();
  const num = String(count + 1).padStart(4, "0");
  return `INV-${year}-${num}`;
};

// ─────────────────────────────────────────────────────────────
// HELPER — GENERATE PDF
// Creates invoice PDF and saves to /uploads/invoices/
// Returns local file path
// ─────────────────────────────────────────────────────────────

const generateInvoicePDF = async (invoiceData: {
  invoiceNumber: string;
  trainerName: string;
  trainerBio?: string;
  userName: string;
  userEmail: string;
  description: string;
  amount: number; // in cents
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  expiresAt: Date;
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "invoices",
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${invoiceData.invoiceNumber}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // ── Header ───────────────────────────────────────────────
    doc.fontSize(24).font("Helvetica-Bold").text("P2P FITTECH", 50, 50);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text("AI-Powered Personal Training Platform", 50, 80);

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("INVOICE", 400, 50, { align: "right" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#444444")
      .text(`Invoice #: ${invoiceData.invoiceNumber}`, 400, 80, {
        align: "right",
      })
      .text(
        `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        400,
        95,
        { align: "right" },
      );

    // ── Divider ───────────────────────────────────────────────
    doc.moveTo(50, 120).lineTo(560, 120).stroke("#dddddd");

    // ── From / To ─────────────────────────────────────────────
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#888888")
      .text("FROM", 50, 140);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(invoiceData.trainerName, 50, 155);

    if (invoiceData.trainerBio) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#666666")
        .text(invoiceData.trainerBio, 50, 170, { width: 200 });
    }

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#888888")
      .text("TO", 300, 140);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(invoiceData.userName, 300, 155);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(invoiceData.userEmail, 300, 170);

    // ── Divider ───────────────────────────────────────────────
    doc.moveTo(50, 210).lineTo(560, 210).stroke("#dddddd");

    // ── Table Header ──────────────────────────────────────────
    doc.rect(50, 225, 510, 25).fill("#f5f5f5");

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text("DESCRIPTION", 60, 233)
      .text("PERIOD", 300, 233)
      .text("AMOUNT", 480, 233, { width: 70, align: "right" });

    // ── Table Row ─────────────────────────────────────────────
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#000000")
      .text(invoiceData.description, 60, 265, { width: 230 });

    const periodText = `${invoiceData.periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${invoiceData.periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    doc.text(periodText, 300, 265, { width: 170 });

    const amountFormatted = `$${(invoiceData.amount / 100).toFixed(2)}`;
    doc
      .font("Helvetica-Bold")
      .text(amountFormatted, 480, 265, { width: 70, align: "right" });

    // ── Divider ───────────────────────────────────────────────
    doc.moveTo(50, 295).lineTo(560, 295).stroke("#dddddd");

    // ── Total ─────────────────────────────────────────────────
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("TOTAL:", 400, 315)
      .text(amountFormatted, 480, 315, { width: 70, align: "right" });

    // ── Payment Due ───────────────────────────────────────────
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(
        `Payment Due: ${invoiceData.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        50,
        360,
      );

    // ── Footer ────────────────────────────────────────────────
    doc.moveTo(50, 700).lineTo(560, 700).stroke("#dddddd");

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#aaaaaa")
      .text("P2P FitTech — AI-Powered Personal Training", 50, 710, {
        align: "center",
      })
      .text("This invoice was generated automatically.", 50, 722, {
        align: "center",
      });

    doc.end();

    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
};

// ─────────────────────────────────────────────────────────────
// CREATE INVOICE (trainer creates after accepting request)
// Generates PDF automatically
// ─────────────────────────────────────────────────────────────

export const createInvoice = async (
  trainerId: string,
  requestId: string,
  amount: number, // in cents e.g. 2900 = $29
  description: string,
) => {
  // 1. Verify request exists and belongs to this trainer
  const request = await TrainerRequestModel.findOne({
    _id: requestId,
    trainerId,
    status: "accepted",
  });
  if (!request) {
    throw new Error("Request not found or not in accepted status");
  }

  // 2. Check no invoice already exists for this request
  const existingInvoice = await InvoiceModel.findOne({
    requestId,
    status: { $in: ["draft", "sent"] },
  });
  if (existingInvoice) {
    throw new Error("An invoice already exists for this request");
  }

  // 3. Load trainer and user data for PDF
  const trainer = await TrainerModel.findById(trainerId).lean();
  if (!trainer) throw new Error("Trainer not found");

  const user = await UserModel.findById(request.userId).lean();
  if (!user) throw new Error("User not found");

  // 4. Calculate period dates
  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  // Invoice expires in 7 days if not paid
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 5. Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // 6. Generate PDF
  const pdfPath = await generateInvoicePDF({
    invoiceNumber,
    trainerName: trainer.name,
    trainerBio: trainer.bio,
    userName: `${(user as any).firstName} ${(user as any).lastName}`,
    userEmail: (user as any).email,
    description,
    amount,
    currency: "usd",
    periodStart,
    periodEnd,
    expiresAt,
  });

  // 7. Build public URL for PDF
  // Replace this with your actual file serving URL
  const fileName = `${invoiceNumber}.pdf`;
  const pdfUrl = `${process.env.BASE_URL || "https://faisal8080.merinasib.shop"}/uploads/invoices/${fileName}`;
  // PDF saved to public/uploads/invoices/ which is served by express.static("public")

  // 8. Save invoice to DB
  const invoice = await InvoiceModel.create({
    userId: request.userId,
    trainerId,
    requestId,
    amount,
    currency: "usd",
    description,
    periodStart,
    periodEnd,
    status: "draft",
    pdfUrl,
    isRenewal: false,
    expiresAt,
  });

  return invoice;
};

// ─────────────────────────────────────────────────────────────
// SEND INVOICE (trainer clicks "Send Invoice" button)
// Status changes from draft → sent
// User receives notification (handled by cron/notification service)
// ─────────────────────────────────────────────────────────────

export const sendInvoice = async (trainerId: string, invoiceId: string) => {
  // 1. Find the invoice and verify draft status
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    trainerId,
    status: "draft",
  });
  if (!invoice) throw new Error("Invoice not found or already sent");

  // Guard: Block sending/paying standard invoices if user already has an active subscription (non-renewals)
  if (!invoice.isRenewal) {
    const activeSub = await SubscriptionModel.findOne({
      userId: invoice.userId,
      status: "active",
      endDate: { $gt: new Date() },
    });
    if (activeSub) {
      throw new Error("This user already has an active subscription. Standard invoices cannot be sent or paid until their current subscription expires.");
    }
  }

  // Load trainer and user details
  const trainer = await TrainerModel.findById(trainerId).lean();
  if (!trainer) throw new Error("Trainer not found");

  const user = await UserModel.findById(invoice.userId).lean();
  if (!user) throw new Error("User not found");

  // 2. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: invoice.currency || "usd",
          product_data: {
            name: `Trainer Subscription — ${trainer.name}`,
            description:
              invoice.description || "Personal Training Subscription",
          },
          unit_amount: invoice.amount, // already in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.STRIPE_SUCCESS_URL || "https://faisal8080.merinasib.shop"}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoiceId=${(invoice._id as any).toString()}`,
    cancel_url: `${process.env.STRIPE_CANCEL_URL || "https://faisal8080.merinasib.shop"}/payment-cancel?invoiceId=${(invoice._id as any).toString()}`,
    metadata: {
      invoiceId: (invoice._id as any).toString(),
      userId: invoice.userId.toString(),
      trainerId: invoice.trainerId.toString(),
    },
  });

  if (!session.url) {
    throw new Error("Failed to generate Stripe payment session URL");
  }

  // 3. Save Stripe payment URL on Invoice
  invoice.paymentUrl = session.url;
  invoice.status = "sent";
  invoice.sentAt = new Date();
  await invoice.save();

  // 4. Send email to user containing the payment link
  const userEmail = (user as any).email;
  const userName = `${(user as any).firstName} ${(user as any).lastName}`;

  await sendInvoiceEmail(
    userEmail,
    userName,
    trainer.name,
    invoice.amount,
    invoice.description,
    session.url,
    invoice.pdfUrl,
  ).catch((err) => {
    console.error("Failed to send invoice email:", err);
  });

  return invoice.populate([
    { path: "userId", select: "firstName lastName email" },
    { path: "trainerId", select: "name specialty" },
  ]);
};

// ─────────────────────────────────────────────────────────────
// CREATE RENEWAL INVOICE
// Called when trainer sends renewal invoice after 30 days
// ─────────────────────────────────────────────────────────────

export const createRenewalInvoice = async (
  trainerId: string,
  previousInvoiceId: string,
  amount: number,
  description: string,
) => {
  // 1. Find the previous invoice
  const previousInvoice = await InvoiceModel.findOne({
    _id: previousInvoiceId,
    trainerId,
    status: "paid",
  });
  if (!previousInvoice) throw new Error("Previous paid invoice not found");

  // 2. Load trainer and user
  const trainer = await TrainerModel.findById(trainerId).lean();
  if (!trainer) throw new Error("Trainer not found");

  const user = await UserModel.findById(previousInvoice.userId).lean();
  if (!user) throw new Error("User not found");

  // 3. New period starts from old period end
  const periodStart = new Date(previousInvoice.periodEnd);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invoiceNumber = await generateInvoiceNumber();

  // 4. Generate PDF
  const pdfPath = await generateInvoicePDF({
    invoiceNumber,
    trainerName: trainer.name,
    trainerBio: trainer.bio,
    userName: `${(user as any).firstName} ${(user as any).lastName}`,
    userEmail: (user as any).email,
    description,
    amount,
    currency: "usd",
    periodStart,
    periodEnd,
    expiresAt,
  });

  const fileName = `${invoiceNumber}.pdf`;
  const pdfUrl = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/invoices/${fileName}`;

  // 5. Create renewal invoice
  const invoice = await InvoiceModel.create({
    userId: previousInvoice.userId,
    trainerId,
    requestId: previousInvoice.requestId,
    amount,
    currency: "usd",
    description,
    periodStart,
    periodEnd,
    status: "draft",
    pdfUrl,
    isRenewal: true,
    previousInvoiceId: previousInvoice._id,
    expiresAt,
  });

  return invoice;
};

// ─────────────────────────────────────────────────────────────
// GET MY INVOICES (user sees their received invoices)
// ─────────────────────────────────────────────────────────────

export const getMyInvoices = async (userId: string) => {
  return await InvoiceModel.find({ userId })
    .populate("trainerId", "name specialty profileImage")
    .sort({ createdAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE INVOICE
// ─────────────────────────────────────────────────────────────

export const getInvoiceById = async (invoiceId: string, userId: string) => {
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    $or: [{ userId }, { trainerId: userId }],
  })
    .populate("trainerId", "name specialty profileImage bio")
    .populate("userId", "firstName lastName email")
    .lean();

  if (!invoice) throw new Error("Invoice not found");
  return invoice;
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER INVOICES (trainer dashboard)
// ─────────────────────────────────────────────────────────────

export const getTrainerInvoices = async (
  trainerId: string,
  filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => {
  const query: Record<string, unknown> = { trainerId };
  if (filters.status) query.status = filters.status;

  const search = filters.search?.trim();
  if (search) {
    const searchRegex = new RegExp(search, "i");
    const matchingUsers = await UserModel.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: search,
              options: "i",
            },
          },
        },
      ],
    }).select("_id");

    query.userId = { $in: matchingUsers.map((user) => user._id) };
  }

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const [data, totalData] = await Promise.all([
    InvoiceModel.find(query)
      .populate({ path: "userId", select: TRAINER_VIEW_USER_SELECT })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InvoiceModel.countDocuments(query),
  ]);

  const pagination = paginationBuilder({ totalData, currentPage: page, limit });

  const enrichedData = data.map((invoice) => ({
    ...invoice,
    userId: formatUserForTrainerView(
      invoice.userId as unknown as Record<string, unknown>,
    ),
  }));

  return { data: enrichedData, pagination };
};
