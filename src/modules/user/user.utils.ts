import { OTPModel, UserModel } from "./user.model";
import { Nodemailer_GMAIL, Nodemailer_GMAIL_PASSWORD } from "../../config";

import nodemailer from "nodemailer";
import { IUser } from "./user.interface";

import argon2 from "argon2";
import ApiError from "../../errors/ApiError";

export const sendOTPEmailRegister = async (
  name: string,
  email: string,
  otp: string,
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: Nodemailer_GMAIL,
      pass: Nodemailer_GMAIL_PASSWORD,
    },
  });

  const emailContent = `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f2f9fc; padding: 30px 20px; border-radius: 10px;">
      <h1 style="text-align: center; color:#111111 font-family: 'Times New Roman', Times, serif; font-size: 32px; letter-spacing: 2px;">
       ${process.env.AppName}
      </h1>
      <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #111111; text-align: center; font-size: 24px; font-weight: bold;">Hello ${name}!</h2>
        <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6;">You are receiving this email because we received a registration request for your account.</p>
        
        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #111111; color: white; border-radius: 8px; font-size: 24px; font-weight: bold;">
          <h3 style="margin: 0; color:#FFFFFF" >Your OTP is: <strong>${otp}</strong></h3>
        </div>
        
        <p style="text-align: center; color: #e10600; font-weight: bold; font-size: 14px; margin-top: 20px;">This OTP will expire in 3 minutes.</p>
        <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6; margin-top: 20px;">If you did not request this, no further action is required.</p>
        <p style="font-size: 16px; color: #333; text-align: center; margin-top: 20px;">Regards,<br>${process.env.AppName}</p>
      </div>
      
      <p style="font-size: 12px; color: #666; margin-top: 10px; text-align: center;">If you're having trouble copying the OTP, please try again.</p>
    </div>
    
      `;

  const mailOptions = {
    from: "nodemailerapptest@gmail.com",
    to: email,
    subject: "Registration OTP",
    html: emailContent,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Unexpected error:", error);
    throw new ApiError(500, "Unexpected error occurred during email sending.");
  }
};
export const sendOTPEmailVerification = async (
  name: string,
  email: string,
  otp: string,
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: Nodemailer_GMAIL,
      pass: Nodemailer_GMAIL_PASSWORD,
    },
  });

  const emailContent = `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f2f9fc; padding: 30px 20px; border-radius: 10px;">
      <h1 style="text-align: center; color:#111111; font-family: 'Times New Roman', Times, serif; font-size: 32px; letter-spacing: 2px;">
       ${process.env.AppName}
      </h1>
      <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #111111; text-align: center; font-size: 24px; font-weight: bold;">Hello ${name}!</h2>
        <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6;">Your account is not yet verified. Please use the OTP below to complete your verification.</p>
        
        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #111111; color: white; border-radius: 8px; font-size: 24px; font-weight: bold;">
          <h3 style="margin: 0; color:#FFFFFF" >Your OTP is: <strong>${otp}</strong></h3>
        </div>
        
        <p style="text-align: center; color: #e10600; font-weight: bold; font-size: 14px; margin-top: 20px;">This OTP will expire in 3 minutes.</p>
        <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6; margin-top: 20px;">If you did not request this, please ignore this email.</p>
        <p style="font-size: 16px; color: #333; text-align: center; margin-top: 20px;">Regards,<br>${process.env.AppName}</p>
      </div>
      
      <p style="font-size: 12px; color: #666; margin-top: 10px; text-align: center;">If you're having trouble copying the OTP, please try again.</p>
    </div>
  `;

  const mailOptions = {
    from: "nodemailerapptest@gmail.com",
    to: email,
    subject: "Verify Your Account - OTP",
    html: emailContent,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Unexpected error:", error);
    throw new ApiError(500, "Unexpected error occurred during email sending.");
  }
};

export const getStoredOTP = async (email: string): Promise<string | null> => {
  const otpRecord = await OTPModel.findOne({ email });
  return otpRecord ? otpRecord.otp : null;
};
export const sendOTPEmail = async (
  email: string,
  otp: string,
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: Nodemailer_GMAIL,
      pass: Nodemailer_GMAIL_PASSWORD,
    },
  });

  const emailContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f2f9fc; padding: 30px 20px; border-radius: 10px;">
    <h1 style="text-align: center; color: #1a3d6d; font-family: 'Times New Roman', Times, serif; font-size: 32px; letter-spacing: 2px;">
      Shower<span style="color:#00c38a; font-size: 0.9em;">share</span>
    </h1>
    <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
      <h2 style="color:#111111; text-align: center; font-size: 24px; font-weight: bold;">Hello!</h2>
      <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6;">You are receiving this email because we received a registration request for your account.</p>
      
      <div style="text-align: center; margin: 30px 0; padding: 20px; background-color:#111111; color: white; border-radius: 8px; font-size: 24px; font-weight: bold;">
        <h3 style="margin: 0;">Your OTP is: <strong>${otp}</strong></h3>
      </div>
      
      <p style="text-align: center; color: #e10600; font-weight: bold; font-size: 14px; margin-top: 20px;">This OTP will expire in 3 minutes.</p>
      <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6; margin-top: 20px;">If you did not request this, no further action is required.</p>
      <p style="font-size: 16px; color: #333; text-align: center; margin-top: 20px;">Regards,<br>${process.env.AppName}</p>
    </div>
    
    <p style="font-size: 12px; color: #666; margin-top: 10px; text-align: center;">If you're having trouble copying the OTP, please try again.</p>
  </div>
  
  
    `;

  const mailOptions = {
    from: "nodemailerapptest@gmail.com",
    to: email,
    subject: "Registration OTP",
    html: emailContent,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Unexpected error:", error);
    throw new ApiError(500, "Unexpected error occurred during email sending.");
  }
};

export const resendOTPEmail = async (
  email: string,
  otp: string,
  // name: string,
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: Nodemailer_GMAIL,
        pass: Nodemailer_GMAIL_PASSWORD,
      },
    });

    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f2f9fc; padding: 30px 20px; border-radius: 10px;">
      <h1 style="text-align: center; color: #1a3d6d; font-family: 'Times New Roman', Times, serif; font-size: 32px; letter-spacing: 2px;">
       ${process.env.AppName}
      </h1>
      <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
        <h2 style="color:#111111; text-align: center; font-size: 24px; font-weight: bold;">Hello!</h2>
        <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6;">
          We noticed you requested another OTP for verification. Use the code below to complete your process.
        </p>
        
        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color:#111111; color: white; border-radius: 8px; font-size: 24px; font-weight: bold;">
          <h3 style="margin: 0; color: #FFFFFF">Your New OTP is: <strong>${otp}</strong></h3>
        </div>
        
        <p style="text-align: center; color: #e10600; font-weight: bold; font-size: 14px; margin-top: 20px;">
          This OTP will expire in 3 minutes.
        </p>
        <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6; margin-top: 20px;">
          If you did not request this, please ignore this email.
        </p>
        <p style="font-size: 16px; color: #333; text-align: center; margin-top: 20px;">
          Regards,<br>${process.env.AppName}
        </p>
      </div>
      
      <p style="font-size: 12px; color: #666; margin-top: 10px; text-align: center;">
        If you're having trouble copying the OTP, please try again.
      </p>
    </div>
    `;

    const mailOptions = {
      from: "nodemailerapptest@gmail.com",
      to: email,
      subject: "Resend OTP ",
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending OTP email to ${email}:`, error);
    throw new ApiError(500, "Unexpected error occurred during email sending.");
  }
};
export const sendResetOTPEmail = async (
  email: string,
  otp: string,
  name: string,
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: Nodemailer_GMAIL,
        pass: Nodemailer_GMAIL_PASSWORD,
      },
    });

    const emailContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f2f9fc; padding: 30px 20px; border-radius: 10px;">
   <h1 style="text-align: center; color: #111111; font-family: 'Times New Roman', Times, serif; font-size: 32px; letter-spacing: 2px;">
    ${process.env.AppName}
  </h1>
  
  <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #111111; text-align: center; font-size: 24px; font-weight: bold;">Hello ${name}!</h2>
    <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6;">You are receiving this email because we received a password reset request for your account.</p>
    
    <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #111111; color: white; border-radius: 8px; font-size: 24px; font-weight: bold;">
      <h3 style="margin: 0; color: #FFFFFF">Your OTP is: <strong>${otp}</strong></h3>
    </div>
    
    <p style="text-align: center; color: #e10600; font-weight: bold; font-size: 14px; margin-top: 20px;">This OTP will expire in 3 minutes.</p>
    <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6; margin-top: 20px;">If you did not request a password reset, no further action is required.</p>
    <p style="font-size: 16px; color: #333; text-align: center; margin-top: 20px;">Regards,<br></p>
  </div>
  
  <p style="font-size: 12px; color: #666; margin-top: 10px; text-align: center;">If you're having trouble copying the OTP, please try again.</p>
</div>


    `;

    const mailOptions = {
      from: "nodemailerapptest@gmail.com",
      to: email,
      subject: "Reset Password OTP",
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending OTP email to ${email}:`, error);
    throw new ApiError(500, "Unexpected error occurred during email sending.");
  }
};
export const sendManagerRequest = async (
  emails: string | string[],
  name: string,
  email: string,
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: Nodemailer_GMAIL,
        pass: Nodemailer_GMAIL_PASSWORD,
      },
    });

    const emailContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f2f9fc; padding: 30px 20px; border-radius: 10px;">
  <h1 style="text-align: center; color: #111111; font-family: 'Times New Roman', Times, serif; font-size: 32px; letter-spacing: 2px;">
    ${process.env.AppName}
  </h1>
  
  <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #111111; text-align: center; font-size: 24px; font-weight: bold;">Hello Admin!</h2>
 <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6;">
      A new manager request has been submitted by <strong>${name}</strong> (<strong>${email}</strong>).
    </p>
  
    <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.6; margin-top: 20px;">
      Please review the request and take the appropriate action.
    </p>
    <p style="font-size: 16px; color: #333; text-align: center; margin-top: 20px;">
      Regards,<br>${process.env.AppName}
    </p>
  </div>
  
  <p style="font-size: 12px; color: #666; margin-top: 10px; text-align: center;">
    This is an automated notification. Please do not reply directly to this email.
  </p>
</div>
`;

    const mailOptions = {
      from: "nodemailerapptest@gmail.com",
      to: emails,
      subject: "New Manager Request Notification",
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending manager request email to ${emails}:`, error);
    throw new ApiError(
      500,
      "Unexpected error occurred during sending manager request email.",
    );
  }
};

export const verifyPassword = async (
  inputPassword: string,
  storedPassword: string,
): Promise<boolean> => {
  try {
    return await argon2.verify(storedPassword, inputPassword);
  } catch (error) {
    throw new Error("Password verification failed");
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password);
  } catch (error) {
    throw new Error("Password hashing failed");
  }
};
//some times it send 5 digit instead of 6
// export const generateOTP = (): string => {
//   return Math.floor(1000 + Math.random() * 900000).toString();
// };

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const saveOTP = async (email: string, otp: string): Promise<void> => {
  await OTPModel.findOneAndUpdate(
    { email },
    { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    { upsert: true, new: true },
  );
};

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return UserModel.findOne({ email });
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  return UserModel.findById(id);
};
