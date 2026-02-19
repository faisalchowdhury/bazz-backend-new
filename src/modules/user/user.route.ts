import express from "express";
import {
  changePassword,
  deleteUser,
  forgotPassword,
  getSelfInfo,
  loginUser,
  resetPassword,
  updateUser,
  uploadProfilePicture,
  UserController,
  verifyOTP,
} from "./user.controller";

import upload from "../../multer/multer";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();
export const uploadImages = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "residancePermit", maxCount: 1 },
  { name: "healthCertificate", maxCount: 1 },
]);
router.post(
  "/register",
  upload.single("profilePicture"),
  UserController.registerUser,
);

router.post("/login", loginUser);

// // router.post("/device-login", UserController.deviceLoginUser);
router.post("/forget-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
router.patch(
  "/profile-update",
  guardRole(["user"]),
  upload.single("profilePicture"),
  updateUser,
);
router.get("/my-profile", guardRole(["admin", "user"]), getSelfInfo);
router.delete("/account-delete", guardRole(["admin", "user"]), deleteUser);
router.post("/change-password", guardRole(["admin", "user"]), changePassword);
router.post("/resend-otp", UserController.resendOTP);

// router.get("/logout", guardRole(["admin", "company"]), logoutUser);

// // router.post("/send-otp");
// // //----------------------->Admin route <--------------------------------
// // router.patch(
// //   "/add-device-id",
// //   guardRole(["customer", "barber"]),
// //   UserController.addDeviceId
// // );
// // router.get("/me", userVerification, UserController.getAdminInfo);

// router.post("/admin-login", UserController.adminloginUser);
router.get("/user-list", guardRole(["admin"]), UserController.getAllUsers);

// // router.put(
// //   "/update-admin-info",
// //   guardRole(["admin", "subadmin"]),
// //   upload.single("profilePicture"),
// //   UserController.updateAdminInformation
// // );

// // // router.put(
// // //   "/update-admin-pass",
// // //   guardRole(["admin", "subadmin"]),
// // //   UserController.updateAdminPassword
// // // );

// // router.get(
// //   "/get-all-customer",
// //   guardRole(["admin", "subadmin"]),
// //   UserController.getAllCustomers
// // );
// // router.put(
// //   "/update-user-status/:userId/:status",
// //   guardRole(["admin", "subadmin"]),
// //   UserController.updateUserStatus
// // );

// // router.get(
// //   "/search-customer",
// //   guardRole(["admin", "subadmin"]),
// //   UserController.searchCustomer
// // );

// // router.get(
// //   "/get-admin",
// //   guardRole(["admin", "subadmin"]),
// //   UserController.getAdminProfile
// // );
// // router.post("/reset-admin-password", resetAdminPassword);

// // router.get(
// //   "/dashboard-stats",
// //   guardRole(["admin", "subadmin"]),
// //   dashboardStats
// // );

// // // router.post(
// // //   "/add-subadmin",
// // //   guardRole(["admin"]),
// // //   upload.single("image"),
// // //   addSuperadmin
// // // );
// // router.get(
// //   "/get-all-subadmin",
// //   guardRole(["admin"]),

// //   UserController.getAllSubadmin
// // );
// // router.get(
// //   "/search-subadmin",
// //   guardRole(["admin"]),

// //   UserController.searchSubadmin
// // );

// // router.get(
// //   "/get-profile-info",
// //   guardRole(["barber", "customer"]),
// //   getProfileInfo
// // );

router.post(
  "/upload-profile-picture",
  guardRole("user"),
  upload.single("profilePicture"),
  uploadProfilePicture,
);

export const UserRoutes = router;
