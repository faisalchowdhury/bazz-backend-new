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

import { CategoryRoutes } from "../modules/category/category.route";
import { ContentRoutes } from "../modules/content/content.route";
import { WorkoutRoutes } from "../modules/workoutGoal/workoutGoal.route";
import { ExerciseRoutes } from "../modules/exercise/exercise.route";
import { ExerciseStepRoutes } from "../modules/exerciseStep/exerciseStep.route";
import { TrainerKnowledgePackRoutes } from "../modules/trainerKnowladge/trainerKnowladge.route";
import { TrainerRoutes } from "../modules/trainer/trainer.route";
import { ChatRoutes } from "../modules/chat/chat.route";
import {
  ExerciseBlockRoutes,
  ExerciseBlockStandaloneRoutes,
} from "../modules/exerciseBlock/exerciseBlock.route";
import { AnamRoutes } from "../modules/anam/anam.routes";
import { TrainerRequestRoutes } from "../modules/trainerRequest/trainerRequest.route";
import { InvoiceRoutes } from "../modules/invoice/invoice.route";
import { SubscriptionRoutes } from "../modules/subscription/subscription.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { UpdateRoutes } from "../modules/update/update.route";
import { CommissionRoutes } from "../modules/commission/commission.route";
import { WithdrawalRoutes } from "../modules/withdrawal/withdrawal.route";
import { PromoCodeRoutes } from "../modules/promoCode/promoCode.route";
import { DefaultContentRoutes } from "../modules/defaultContent/defaultContent.route";
import { IAPRoutes } from "../modules/iap/iap.route";

// import { PaymentRoute } from "../modules/unused_payments/payment.route";

import { DeviceRoutes } from "../modules/device/device.route";

export const routesConfig = [
  { path: "auth", handler: UserRoutes },
  { path: "category", handler: CategoryRoutes },
  { path: "content", handler: ContentRoutes },
  { path: "default-content", handler: DefaultContentRoutes },
  { path: "workout", handler: WorkoutRoutes },
  { path: "trainer", handler: TrainerRoutes },
  { path: "trainerKnowladge", handler: TrainerKnowledgePackRoutes },
  { path: "exercise", handler: ExerciseRoutes },
  { path: "exerciseBlock", handler: ExerciseBlockRoutes },
  { path: "block", handler: ExerciseBlockStandaloneRoutes },
  { path: "exercise-steps", handler: ExerciseStepRoutes },
  { path: "chat", handler: ChatRoutes },
  { path: "anam", handler: AnamRoutes },
  { path: "trainer-request", handler: TrainerRequestRoutes },
  { path: "invoice", handler: InvoiceRoutes },
  { path: "subscription", handler: SubscriptionRoutes },
  { path: "payment", handler: PaymentRoutes },
  { path: "update", handler: UpdateRoutes },
  { path: "commission", handler: CommissionRoutes },
  { path: "withdrawal", handler: WithdrawalRoutes },
  { path: "promo", handler: PromoCodeRoutes },
  { path: "iap", handler: IAPRoutes },
  { path: "devices", handler: DeviceRoutes },

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
