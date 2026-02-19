// Import the 'express' module
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import router from "./routes";
import { logger, logHttpRequests } from "./logger/logger";
import { template } from "./rootTemplate";

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

export default app;
