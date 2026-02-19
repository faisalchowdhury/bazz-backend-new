// // ApiError.ts
// import httpStatus from "http-status";

// class ApiError extends Error {
//   public statusCode: number;
//   public isOperational: boolean;

//   constructor(statusCode: number, message: string, isOperational = true) {
//     console.log(statusCode, message,"-----------<>");
//     super(message);
//     this.statusCode = statusCode;
//     this.isOperational = isOperational;

//     // Capture the stack trace (optional but useful for debugging)
//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// export default ApiError;
import httpStatus from "http-status";

class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorDetails?: { path?: string | null; value?: any };

  constructor(
    statusCode: number,
    message: string,
    errorDetails?: { path?: string | null; value?: any },
    isOperational = true
  ) {
    super(`${message}`);
    // console.log(statusCode, "-------->4");
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorDetails = errorDetails || { path: null, value: null };

    // Remove stack trace completely
    Object.defineProperty(this, "stack", { value: undefined });
  }
}

export default ApiError;
