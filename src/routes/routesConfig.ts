import { UserRoutes } from "../modules/user/user.route";
import { TermsRoutes } from "../modules/settings/Terms/Terms.route";
import { AboutRoutes } from "../modules/settings/About/About.route";
import { PrivacyRoutes } from "../modules/settings/privacy/Privacy.route";
import { NotificationRoutes } from "../modules/notifications/notification.route";

import {
  AppInstruction,
  htmlRoute,
} from "../modules/settings/privacy/Privacy.controller";
import { AdminRoutes } from "../modules/admin/admin.route";

// import { PaymentRoute } from "../modules/unused_payments/payment.route";

export const routesConfig = [
  { path: "auth", handler: UserRoutes },

  { path: "terms", handler: TermsRoutes },
  { path: "about", handler: AboutRoutes },
  { path: "privacy", handler: PrivacyRoutes },
  { path: "notification", handler: NotificationRoutes },

  // { path: "/api/v1/payment", handler: PaymentRoute },

  { path: "admin", handler: AdminRoutes },

  //------>publishing app <--------------
  { path: "/privacy-policy-page", handler: htmlRoute },
  { path: "/app-instruction", handler: AppInstruction },
];
