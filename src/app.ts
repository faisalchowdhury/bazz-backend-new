// Import the 'express' module
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import router from "./routes";
import { logger, logHttpRequests } from "./logger/logger";
import { template } from "./rootTemplate";
import { startCronJobs } from "./utils/corn";
import { verifyPayment } from "./modules/payment/payment.service";
import { InvoiceModel } from "./modules/invoice/invoice.model";

// Create an Express application
const app: Application = express();
app.use(logHttpRequests);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "*",
      "http://localhost:5173",
      "http://localhost:5174",
      "https://barber-admin-dashboard-mytf0qi4b-faisal-chowdhurys-projects.vercel.app",
      "https://barber-admin-dashboard-knvz8p4zy-faisal-chowdhurys-projects.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.static("public"));

//application router
app.use(router);

// Define Stripe Checkout Redirect Landing Pages
app.get("/payment-success", async (req: Request, res: Response) => {
  const sessionId = (req.query.session_id as string) || "";
  const invoiceId = (req.query.invoiceId as string) || "";

  if (!sessionId || !invoiceId) {
    res.status(400).send("Missing session_id or invoiceId query parameters.");
    return;
  }

  try {
    // 1. Verify if the invoice is already paid (handles refreshing the success screen gracefully)
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) {
      res.status(404).send("Invoice not found.");
      return;
    }

    if (invoice.status !== "paid") {
      // 2. Automatically trigger our server-to-server payment verification pipeline in-memory
      const userId = invoice.userId.toString();
      await verifyPayment(userId, invoiceId, sessionId, "stripe");
    }

    // 3. Render gorgeous responsive success HTML
    res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful - P2P FitTech</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f7fafd;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
      padding: 40px;
      text-align: center;
      max-width: 480px;
      width: 90%;
    }
    .icon-container {
      width: 80px;
      height: 80px;
      background-color: #e6f7f0;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 24px;
    }
    .icon-container svg {
      width: 40px;
      height: 40px;
      color: #00c38a;
    }
    h1 {
      color: #111111;
      font-size: 26px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 30px;
    }
    .btn {
      background-color: #0073e6;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #005bb8;
    }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>Payment Successful!</h1>
    <p>Thank you for your purchase. Your subscription has been activated successfully, and you can now start chatting with your live personal trainer!</p>
    <a href="p2pfittech://payment-success?session_id=${sessionId}&invoiceId=${invoiceId}" class="btn">Return to App</a>
    <div class="footer">
      P2P FitTech — AI-Powered Training
    </div>
  </div>
</body>
</html>
    `);
  } catch (err: any) {
    logger.error("Auto-verification failed inside /payment-success:", err);
    res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Verification Failed</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #fffafb; }
    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 450px; }
    h1 { color: #ff3366; }
    p { color: #555; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Verification Failed</h1>
    <p>We encountered an error while verifying your payment: <strong>${err.message}</strong></p>
    <p>Please contact support if you have been charged.</p>
  </div>
</body>
</html>
    `);
  }
});

app.get("/payment-cancel", (req: Request, res: Response) => {
  const invoiceId = req.query.invoiceId || "";
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Cancelled - P2P FitTech</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #fffafb;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
      padding: 40px;
      text-align: center;
      max-width: 480px;
      width: 90%;
    }
    .icon-container {
      width: 80px;
      height: 80px;
      background-color: #fef0f2;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 24px;
    }
    .icon-container svg {
      width: 40px;
      height: 40px;
      color: #ff3366;
    }
    h1 {
      color: #111111;
      font-size: 26px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 30px;
    }
    .btn {
      background-color: #666666;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #444444;
    }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
    <h1>Payment Cancelled</h1>
    <p>The payment process was cancelled, and you have not been charged. You can close this window and try paying again when you're ready.</p>
    <a href="p2pfittech://payment-cancelled?invoiceId=${invoiceId}" class="btn">Close & Return</a>
    <div class="footer">
      P2P FitTech — AI-Powered Training
    </div>
  </div>
</body>
</html>
  `);
});

// Define a route for the root path ('/')
app.get("/", (req: Request, res: Response) => {
  logger.info("Root endpoint hit 🌐 :");
  res.status(200).send(template);
});

app.all("*", notFound);
app.use(globalErrorHandler);

// create qr code product in kolaybi

// Log errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error occurred: ${err.message}`, { stack: err.stack });
  next(err);
});
startCronJobs();
export default app;
