import httpStatus from "http-status";
import sendError from "../../../utils/sendError";
import {
  createPrivacyInDB,
  getAllPrivacyFromDB,
  updatePrivacyInDB,
} from "./Privacy.service";
import sendResponse from "../../../utils/sendResponse";
import { findUserById } from "../../user/user.utils";
import catchAsync from "../../../utils/catchAsync";

import sanitizeHtml from "sanitize-html";

import { Request, Response } from "express";
import { verifyToken } from "../../../utils/JwtToken";
import ApiError from "../../../errors/ApiError";
import { sanitizeOptions } from "../../../utils/SanitizeOptions";

export const createPrivacy = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error);
  }
  const userId = decoded.id as string; // Assuming the token contains the userId

  // Find the user by userId
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  const { description } = req.body;
  const sanitizedContent = sanitizeHtml(description, sanitizeOptions);
  if (!description) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Description is required!");
  }

  const result = await createPrivacyInDB({ sanitizedContent });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Privacy created successfully.",
    data: result,
  });
});

export const getAllPrivacy = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllPrivacyFromDB();
  const responseData = result[0];
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Privacy retrieved successfully.",
    data: responseData,
  });
});

export const updatePrivacy = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error);
  }

  const userId = decoded.id as string;

  // Find the user by userId
  const user = await findUserById(userId);
  if (!user) {
    // return sendError(res, {
    //   statusCode: httpStatus.NOT_FOUND,
    //   message: "User not found.",
    // });
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  // Sanitize the description field
  const { description } = req.body;

  if (!description) {
    // return sendError(res, {
    //   statusCode: httpStatus.BAD_REQUEST,
    //   message: "Description is required.",
    // });
  }

  const sanitizedDescription = sanitizeHtml(description, sanitizeOptions);

  // Assume you're updating the terms based on the sanitized description
  const result = await updatePrivacyInDB(sanitizedDescription);

  if (!result) {
    // return sendError(res, {
    //   statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    //   message: "Failed to update privacy.",
    // });
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update privacy."
    );
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Privacy updated successfully.",
    data: result,
  });
});

//------------->app publish ----------------------
export const htmlRoute = catchAsync(async (req: Request, res: Response) => {
  try {
    // Fetch the privacy policy data from the database
    const result = await getAllPrivacyFromDB();

    // Ensure that data exists and extract the first item
    const privacy = result && result.length > 0 ? result[0] : null;

    if (!privacy) {
      // If no privacy data is found, send a 404 response
      throw new ApiError(404, "Privacy policy not found.");
    }

    // Set the Content-Type header to text/html
    res.header("Content-Type", "text/html");

    // Send the HTML response with the privacy policy content
    res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Privacy Policy</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                  color: #333;
              }
              .container {
                  max-width: 800px;
                  margin: 30px auto;
                  padding: 20px;
                  background: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #444;
              }
              footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 0.9em;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
             
              ${privacy.description}
          </div>
         
      </body>
      </html>`);
  } catch (error: any) {
    console.error("Error fetching privacy policy:", error);
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch html route api."
    );
  }
});
export const AppInstruction = catchAsync(
  async (req: Request, res: Response) => {
    try {
      // Set the Content-Type header to text/html
      res.header("Content-Type", "text/html");

      // Send the HTML response with the privacy policy content
      res.send(`

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instruction Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background-color: #f9f9f9;
            color: #333;
        }
        header {
            background: #4CAF50;
            color: white;
            padding: 10px 0;
            text-align: center;
        }
        section {
            margin: 20px 0;
        }
        h1, h2 {
            color: #4CAF50;
        }
        ol {
            padding-left: 20px;
        }
        li {
            margin-bottom: 10px;
        }
        .step-image {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
            border: 1px solid #ddd;
        }
        footer {
            text-align: center;
            margin-top: 20px;
            font-size: 0.9em;
            color: #777;
        }
    </style>
</head>
<body>
    <header>
        <h1>Instruction Guide</h1>
    </header>

    <section style="margin: 0 auto; display: flex; flex-direction: column; align-items: center; text-align: center;">
        <h2>Step-by-Step Instructions</h2>
        <ol style="list-style-position: inside; padding: 0;">
            <li style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; font-size: 2rem;">
                1. After logged in, first route to the Profile screen.
                <img src="https://showersshare.com/images/4.png" height="500" width="400" alt="Troubleshooting" class="step-image">

            </li>
            <li style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; font-size: 2rem;">
                2. Tap on Settings.
                <img src="https://showersshare.com/images/1.png" height="500" width="400" alt="Gathering Materials" class="step-image">
            </li>
            <li style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; font-size: 2rem;">
                3. Then tap on Delete.
                <img src="https://showersshare.com/images/2.png" height="500" width="400" alt="Following Steps" class="step-image">
            </li>
           
            <li style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; font-size: 2rem;">
                4. Press the Delete button.
                <img src="https://showersshare.com/images/3.png" height="500" width="400" alt="Reviewing Work" class="step-image">
            </li>
        </ol>
    </section>
    
    

    <footer>
        <p>&copy; 2025 Shower Share All rights reserved.</p>
    </footer>
</body>
</html>


    `);
    } catch (error: any) {
      console.error("Error fetching privacy policy:", error);
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to fetch instruction api."
      );
    }
  }
);
