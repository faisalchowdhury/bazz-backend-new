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

// import { PaymentRoute } from "../modules/unused_payments/payment.route";

export const routesConfig = [
  { path: "auth", handler: UserRoutes },
  { path: "category", handler: CategoryRoutes },
  { path: "content", handler: ContentRoutes },
  { path: "workout", handler: WorkoutRoutes },
  { path: "trainer", handler: TrainerRoutes },
  { path: "trainerKnowladge", handler: TrainerKnowledgePackRoutes },
  { path: "exercise", handler: ExerciseRoutes },
  { path: "exerciseBlock", handler: ExerciseBlockRoutes },
  { path: "block", handler: ExerciseBlockStandaloneRoutes },
  { path: "exercise-steps", handler: ExerciseStepRoutes },
  { path: "chat", handler: ChatRoutes },

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
