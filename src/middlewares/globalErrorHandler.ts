import { ZodError } from "zod";
import { ErrorRequestHandler } from "express";
import { IErrorResponse } from "../interface/error";
import handlerZodError from "../errors/handleZodError";
import mongoose from "mongoose";
import handleValidationError from "../errors/handleValidationError";
import handlerCastError from "../errors/handleCastError";
import handlerDuplicateError from "../errors/handleDuplicateError";

import { NODE_ENV } from "../config";
import ApiError from "../errors/ApiError";

// const globalErrorHandler: ErrorRequestHandler = (
//   error: any,
//   req: any,
//   res: any,
//   next: any,
// ) => {
//   let errorInfo: IErrorResponse = {
//     success: false,
//     statusCode: 500,
//     // statusCode: 400,
//     message: "Invalid request",
//      errorMessage: "",
//     errorDetails: {
//       path: null,
//       value: null,
//     },
//   };
//   if (error instanceof ZodError) {
//     errorInfo = handlerZodError(error);
//   } else if (error instanceof mongoose.Error.ValidationError) {
//     errorInfo = handleValidationError(error);
//   } else if (error instanceof mongoose.Error.CastError) {
//     errorInfo = handlerCastError(error);
//   } else if (error?.code === 11000) {
//     errorInfo = handlerDuplicateError(error);
//   } else if (error instanceof Error) {
//     errorInfo.errorMessage = error.message;
//   } else if (error instanceof ApiError) {
//     console.log(errorInfo,"------->")
//     errorInfo.statusCode = error.statusCode;
//     errorInfo.errorMessage = error.message;
//   }
// console.log(errorInfo,"------global error")
//   return res.status(errorInfo.statusCode).json({
//     success: errorInfo.success,
//     statusCode: errorInfo.statusCode,
//     message: errorInfo.message,
//     errorMessage: errorInfo.errorMessage,
//     errorDetails: errorInfo.errorDetails,
//     stack: NODE_ENV === "development" ? error.stack : null,
//   });
// };

const errorTypeMap: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a Teapot",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  498: "Session Expired",
  499: "Client Closed Request",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
};



const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  let errorInfo: IErrorResponse = {
    success: false,
    statusCode: 500,
    errorType: "Invalid request",
    errorMessage: "",

    errorDetails: { path: null, value: null },
  };

  // 1. Check for ApiError first
  if (error instanceof ApiError) {
    errorInfo.statusCode = error.statusCode;
    errorInfo.errorMessage = error.message;
    errorInfo.errorDetails = error.errorDetails || { path: null, value: null };

    // 2. Then check the other known error types
  } else if (error instanceof ZodError) {
    errorInfo = handlerZodError(error);
  } else if (error instanceof mongoose.Error.ValidationError) {
    errorInfo = handleValidationError(error);
  } else if (error instanceof mongoose.Error.CastError) {
    errorInfo = handlerCastError(error);
  } else if (error?.code === 11000) {
    errorInfo = handlerDuplicateError(error);

    // 3. Finally, any generic errors
  } else if (error instanceof Error) {
    // console.log(error,"-----error")
    errorInfo.errorMessage = error.message;
  }
  // Dynamically set errorType based on statusCode
  errorInfo.errorType = errorTypeMap[errorInfo.statusCode] || "Unknown Error";
  // Return the JSON response
  //console.log(first)
  return res.status(errorInfo.statusCode).json({
    success: errorInfo.success,
    path: req.originalUrl,
    status: errorInfo.statusCode,
    errorType: errorInfo.errorType,
    message: errorInfo.errorMessage,
    // errorDetails: errorInfo.errorDetails,
    // stack is hidden unless in dev
    //stack: NODE_ENV === "development" ? error.stack : null,
  });
};

export default globalErrorHandler;
