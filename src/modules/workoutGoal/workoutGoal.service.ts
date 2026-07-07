import { Types } from "mongoose";
import {
  IAIGeneratedPlan,
  IPlannedExercise,
  IWorkout,
} from "./workoutGoal.interface";
import { WorkoutModel } from "./workoutGoal.model";
import { WorkoutStatsModel } from "./workoutStats.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { ExerciseBlockModel } from "../exerciseBlock/exerciseBlock.model";
import { ExerciseModel } from "../exercise/exercise.model";
import { ExerciseStepModel } from "../exerciseStep/exerciseStep.model";
import { ContentModel } from "../content/content.model";
import {
  callAI,
  parseAIJsonResponse,
  summarizeSessionMemory,
} from "../../services/ai.service";
// Safely converts AI output to a number (1-10) or null
// Handles cases where AI returns "great", "high", "7/10", "8" etc.
const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined) return null;

  // Already a valid number
  if (typeof value === "number" && !isNaN(value)) {
    return Math.min(10, Math.max(1, Math.round(value)));
  }

  // Try parsing string like "8", "7/10", "8.5"
  if (typeof value === "string") {
    // Handle "7/10" format
    const slashMatch = value.match(/^(\d+)\s*\/\s*10$/);
    if (slashMatch) return parseInt(slashMatch[1]);

    // Handle plain number string
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return Math.min(10, Math.max(1, Math.round(parsed)));
    }
  }

  // AI returned a word — return null, don't crash
  return null;
};

const toObjectIdOrUndefined = (value: unknown): Types.ObjectId | undefined => {
  if (value === null || value === undefined) return undefined;

  const str = String(value).trim();
  if (!Types.ObjectId.isValid(str)) return undefined;

  return new Types.ObjectId(str);
};
// ─────────────────────────────────────────────────────────────
// CREATE WORKOUT PREFERENCES
// User fills the form — status: "pending", aiPlan: null
// ─────────────────────────────────────────────────────────────

export const createWorkoutPreferences = async (
  userId: string,
  data: {
    goal: string[];
    focusArea: string[];
    workout_environment: string[];
    equipment_availablity: string[];
    workout_intensity: string[];
    duration: number;
    date: Date;
  },
): Promise<IWorkout> => {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.subscribedTrainer)
    throw new Error(
      "User has no subscribed trainer. Complete onboarding first.",
    );

  const workout = new WorkoutModel({
    userId,
    trainerId: user.subscribedTrainer,
    ...data,
    status: "pending",
    aiPlan: null,
  });

  return await workout.save();
};

// ─────────────────────────────────────────────────────────────
// GENERATE AI PLAN
// Queries ExerciseBlock + Exercise + ExerciseStep collections
// Snapshots full exercise data into the workout document
// ─────────────────────────────────────────────────────────────

export const generateAIPlan = async (
  userId: string,
  workoutId: string,
): Promise<IWorkout> => {
  if (!Types.ObjectId.isValid(workoutId)) {
    throw new Error("Invalid workout ID");
  }

  // 1. Load workout
  const workout = await WorkoutModel.findOne({ _id: workoutId, userId });
  if (!workout) throw new Error("Workout not found");
  if (workout.aiPlan)
    throw new Error("AI plan already generated for this workout");

  // 2. Load user
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.subscribedTrainer) throw new Error("No subscribed trainer found");

  // 3. Load trainer from separate Trainer collection
  const trainer = await TrainerModel.findById(user.subscribedTrainer);
  if (!trainer) throw new Error("Trainer not found");

  // 4. Get user memory for this trainer
  const memory = user.getMemoryForTrainer(
    (trainer._id as Types.ObjectId).toString(),
  );

  // 5. Load approved blocks from ExerciseBlock collection
  const approvedBlocks = await ExerciseBlockModel.find({
    trainerId: trainer._id,
    isApproved: true,
  }).lean();

  if (approvedBlocks.length === 0) {
    throw new Error(
      "Trainer has no approved exercise blocks yet. Ask your trainer to add and approve exercises.",
    );
  }

  // 6. Load exercises + steps for each block from separate collections

  const blocksWithExercises = (
    await Promise.all(
      approvedBlocks.map(async (block) => {
        const exercises = await ExerciseModel.find({
          blockId: block._id,
          isApproved: true,
        }).lean();

        const exercisesWithSteps = await Promise.all(
          exercises.map(async (exercise) => {
            const steps = await ExerciseStepModel.find({
              exerciseId: exercise._id,
            })
              .sort({ order: 1 })
              .lean();
            return { ...exercise, steps };
          }),
        );

        return { ...block, exercises: exercisesWithSteps };
      }),
    )
  ).filter((block) => block.exercises.length > 0);

  if (blocksWithExercises.length === 0) {
    throw new Error(
      "Trainer has no approved exercises yet. Ask your trainer to approve exercises in their library.",
    );
  }

  // 7. Build AI prompt
  const userMessage = buildWorkoutPromptFromPreferences({
    user,
    trainer,
    memory,
    workout,
    exerciseBlocks: blocksWithExercises,
  });

  // 8. JSON-only system prompt (full trainer prompt asks for markdown lists — breaks JSON parse)
  const systemPrompt = buildWorkoutPlanSystemPrompt(trainer);

  // 9. Call AI — fall back to rule-based plan if AI output is invalid
  let plan: any;
  try {
    const aiResponse = await callAI({
      systemPrompt,
      userMessage,
      maxTokens: 4096,
      jsonPrefill: true,
    });
    plan = parseAIJsonResponse(aiResponse);
  } catch (err) {
    console.warn(
      "Workout AI plan failed, using library fallback:",
      err instanceof Error ? err.message : err,
    );
    plan = buildFallbackWorkoutPlan(workout, trainer, blocksWithExercises);
  }

  if (!Array.isArray(plan.mainWork) || plan.mainWork.length === 0) {
    plan = buildFallbackWorkoutPlan(workout, trainer, blocksWithExercises);
  }

  // Find a matching video content based on user preferences
  const suggestedVideo = await getSuggestedVideo(workout, (trainer._id as any).toString());

  // 11. Map exercises — snapshot full data from collections into workout doc
  const aiPlan: IAIGeneratedPlan = {
    coachNote: plan.coachNote || "",
    thisWeekFocus: plan.thisWeekFocus || [],
    nutritionTip: plan.nutritionTip || "",
    warmUp: plan.warmUp || [],
    mainWork: mapPlannedExercises(plan.mainWork || [], blocksWithExercises),
    accessories: mapPlannedExercises(
      plan.accessories || [],
      blocksWithExercises,
    ),
    finisher: mapPlannedExercises(plan.finisher || [], blocksWithExercises),
    coolDown: plan.coolDown || [],
    estimatedDurationMinutes: plan.estimatedDurationMinutes || workout.duration,
    cardioGuidance: plan.cardioGuidance || "",
    suggestedVideo,
    checkInQuestion:
      plan.checkInQuestion ||
      "Did you complete today's session? What loads did you use and how hard was it (RPE 1-10)? Any pain or equipment issues?",
    generatedAt: new Date(),
    trainerPersona: trainer.name,
    trainerSpecialty: trainer.specialty,
    aiContextSnapshot: {
      userGoal: workout.goal.join(", "),
      fitnessLevel: user.fitnessLevel || "unknown",
      memoryFlags: memory?.rollingMemory?.flags || [],
      exerciseBlocksUsed: [
        ...new Set([
          ...(plan.mainWork || []).map((e: any) => e.blockName).filter(Boolean),
          ...(plan.accessories || [])
            .map((e: any) => e.blockName)
            .filter(Boolean),
        ]),
      ],
    },
  };

  workout.aiPlan = aiPlan;
  workout.status = "pending";
  await workout.save();

  return workout;
};

// ─────────────────────────────────────────────────────────────
// START SESSION
// ─────────────────────────────────────────────────────────────

export const startSessionService = async (
  userId: string,
  workoutId: string,
): Promise<IWorkout> => {
  const workout = await WorkoutModel.findOne({ _id: workoutId, userId });
  if (!workout) throw new Error("Workout not found");
  if (!workout.aiPlan) throw new Error("Generate an AI plan before starting");
  if (workout.status === "completed")
    throw new Error("Session already completed");

  workout.status = "in_progress";
  workout.startedAt = new Date();
  return await workout.save();
};

// ─────────────────────────────────────────────────────────────
// COMPLETE EXERCISE
// User marks a single exercise as done — logs actual weight/RPE
// ─────────────────────────────────────────────────────────────

export const completeExerciseService = async (
  userId: string,
  workoutId: string,
  exerciseId: string,
  completionData: {
    completedSets?: number;
    actualWeight?: string;
    actualRpe?: number;
    notes?: string;
  },
): Promise<IWorkout> => {
  const workout = await WorkoutModel.findOne({ _id: workoutId, userId });
  if (!workout) throw new Error("Workout not found");
  if (!workout.aiPlan) throw new Error("No AI plan found");

  // Search mainWork, accessories, finisher for the exercise
  const allExercises = [
    ...(workout.aiPlan.mainWork || []),
    ...(workout.aiPlan.accessories || []),
    ...(workout.aiPlan.finisher || []),
  ];
  console.log(allExercises);
  const exercise = allExercises.find(
    (e: any) => e.exerciseId.toString() === exerciseId,
  ) as IPlannedExercise | undefined;
  console.log(exercise);
  if (!exercise) throw new Error("Exercise not found in this session");

  exercise.isCompleted = true;
  exercise.completedSets = completionData.completedSets;
  exercise.actualWeight = completionData.actualWeight;
  exercise.actualRpe = completionData.actualRpe;
  exercise.notes = completionData.notes;

  workout.markModified("aiPlan");
  return await workout.save();
};

// ─────────────────────────────────────────────────────────────
// COMPLETE SESSION + CHECK-IN + UPDATE MEMORY
// ─────────────────────────────────────────────────────────────

export const completeSessionService = async (
  userId: string,
  workoutId: string,
  checkInResponse: string,
  actualDurationMinutes?: number,
): Promise<{ workout: IWorkout; memoryUpdated: boolean }> => {
  const workout = await WorkoutModel.findOne({ _id: workoutId, userId });
  if (!workout) throw new Error("Workout not found");
  if (!workout.aiPlan) throw new Error("No AI plan found");
  console.log(workout);
  // 1. Mark session complete
  workout.status = "completed";
  workout.completedAt = new Date();
  workout.actualDurationMinutes = actualDurationMinutes;
  workout.aiPlan.checkInResponse = checkInResponse;
  workout.aiPlan.checkInRespondedAt = new Date();
  workout.markModified("aiPlan");
  await workout.save();

  // Save date-wise statistics to WorkoutStats collection on session completion
  let totalExercises = 0;
  let completedExercises = 0;

  if (workout.aiPlan) {
    const exercises: any[] = [
      ...(workout.aiPlan.mainWork || []),
      ...(workout.aiPlan.accessories || []),
      ...(workout.aiPlan.finisher || []),
    ];
    totalExercises = exercises.length;
    completedExercises = exercises.filter((ex) => ex.isCompleted).length;
  }

  const completionPercentage =
    totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

  await WorkoutStatsModel.findOneAndUpdate(
    { userId: workout.userId, workoutId: workout._id },
    {
      $set: {
        userId: workout.userId,
        workoutId: workout._id,
        date: workout.date || new Date(),
        goal: workout.goal,
        focusArea: workout.focusArea,
        duration: workout.duration,
        workout_intensity: workout.workout_intensity,
        equipment_availablity: workout.equipment_availablity,
        workout_environment: workout.workout_environment,
        totalExercises,
        completedExercises,
        completionPercentage,
        status: "completed",
      },
    },
    { upsert: true, new: true },
  ).catch((err) => {
    console.error("Failed to save WorkoutStats:", err);
  });

  // 2. Build context for memory summarizer
  const exerciseNames = [
    ...(workout.aiPlan.mainWork || []),
    ...(workout.aiPlan.accessories || []),
  ]
    .filter((e: any) => e.isCompleted)
    .map((e: any) => e.exerciseName)
    .join(", ");

  const lastExchange = `
Trainer asked: "${workout.aiPlan.checkInQuestion}"
User responded: "${checkInResponse}"
Today's focus: ${workout.focusArea.join(", ")}
Goal: ${workout.goal.join(", ")}
Intensity: ${workout.workout_intensity.join(", ")}
Exercises completed: ${exerciseNames || "none logged"}
`;
  console.log(lastExchange);
  // 3. AI summarizes session into memory object
  const memoryUpdate = await summarizeSessionMemory(lastExchange);
  if (!memoryUpdate) return { workout, memoryUpdated: false };
  console.log(memoryUpdate);
  // 4. Update user memory
  const user = await UserModel.findById(userId);
  if (!user || !workout.trainerId) return { workout, memoryUpdated: false };

  const memoryIndex = user.memory.findIndex(
    (m: any) => m.trainerId.toString() === workout.trainerId!.toString(),
  );
  if (memoryIndex === -1) return { workout, memoryUpdated: false };

  const mem = user.memory[memoryIndex];

  // Update profile memory with any new facts AI extracted
  if (memoryUpdate.profile_updates) {
    const pu = memoryUpdate.profile_updates;
    if (pu.limitations) mem.profileMemory.limitations = pu.limitations;
    if (pu.equipment) mem.profileMemory.equipment = pu.equipment;
    if (pu.preferences) mem.profileMemory.preferences = pu.preferences;
    mem.profileMemory.updatedAt = new Date();
  }

  // Build new session summary entry
  const newSession = {
    date: new Date(),
    workoutSummary:
      memoryUpdate.session_summary?.workoutSummary ||
      `${workout.focusArea.join(", ")} session`,
    exercisesCompleted: exerciseNames.split(", ").filter(Boolean),
    loadsUsed: memoryUpdate.session_summary?.loadsUsed || {},
    adherence: memoryUpdate.session_summary?.adherence || "completed",
    rpe: toNumberOrNull(memoryUpdate.session_summary?.rpe), // ← sanitize
    painNotes: memoryUpdate.session_summary?.painNotes,
    energyLevel: toNumberOrNull(memoryUpdate.session_summary?.energyLevel), // ← sanitize
    flags: memoryUpdate.flags || [],
  };

  // Keep only last 3 sessions in rolling memory
  mem.rollingMemory.last3Sessions.push(newSession as any);
  if (mem.rollingMemory.last3Sessions.length > 3) {
    mem.rollingMemory.last3Sessions = mem.rollingMemory.last3Sessions.slice(-3);
  }
  mem.rollingMemory.flags = memoryUpdate.flags || [];
  mem.rollingMemory.updatedAt = new Date();
  mem.lastUpdatedAt = new Date();

  // 5. Push to user workout history
  user.workoutHistory.push({
    trainerId: workout.trainerId,
    date: new Date(),
    focus: workout.focusArea.join(", "),
    exercisesPerformed: [
      ...(workout.aiPlan.mainWork || []),
      ...(workout.aiPlan.accessories || []),
    ].map((e: any) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      blockName: e.blockName,
      sets: e.completedSets || e.sets,
      reps: e.reps,
      weight: e.actualWeight,
      rpe: e.actualRpe,
      completed: e.isCompleted,
    })),
    sessionRpe: toNumberOrNull(memoryUpdate.session_summary?.rpe),
    durationMinutes: actualDurationMinutes,
    aiPlanUsed: true,
    notes: checkInResponse,
  } as any);

  await user.save();

  return { workout, memoryUpdated: true };
};

// ─────────────────────────────────────────────────────────────
// SKIP SESSION
// ─────────────────────────────────────────────────────────────

export const skipSessionService = async (
  userId: string,
  workoutId: string,
): Promise<IWorkout> => {
  const workout = await WorkoutModel.findOne({ _id: workoutId, userId });
  if (!workout) throw new Error("Workout not found");

  workout.status = "skipped";
  return await workout.save();
};

// ─────────────────────────────────────────────────────────────
// GET USER WORKOUTS
// ─────────────────────────────────────────────────────────────

export const getUserWorkoutsService = async (
  userId: string,
  filters: { status?: string; limit?: number } = {},
): Promise<IWorkout[]> => {
  const query: any = { userId };
  if (filters.status) query.status = filters.status;

  return await WorkoutModel.find(query)
    .populate("trainerId", "name specialty profileImage")
    .sort({ date: -1 })
    .limit(filters.limit || 20)
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE WORKOUT
// ─────────────────────────────────────────────────────────────

export const getWorkoutByIdService = async (
  userId: string,
  workoutId: string,
): Promise<IWorkout | null> => {
  return await WorkoutModel.findOne({ _id: workoutId, userId })
    .populate("trainerId", "name specialty profileImage")
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET TODAY'S WORKOUT
// ─────────────────────────────────────────────────────────────

export const getTodaysWorkoutService = async (
  userId: string,
): Promise<IWorkout | null> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return await WorkoutModel.findOne({
    userId,
    date: { $gte: start, $lte: end },
  })
    .populate("trainerId", "name specialty profileImage")
    .lean();
};

// ─────────────────────────────────────────────────────────────
// DELETE WORKOUT (pending only)
// ─────────────────────────────────────────────────────────────

export const deleteWorkoutService = async (
  userId: string,
  workoutId: string,
): Promise<void> => {
  const workout = await WorkoutModel.findOne({ _id: workoutId, userId });
  if (!workout) throw new Error("Workout not found");
  if (workout.status !== "pending") {
    throw new Error(
      "Cannot delete a workout that has been started or completed",
    );
  }
  await WorkoutModel.deleteOne({ _id: workoutId });
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Dedicated prompt for structured plan generation — not the chat/call persona prompt
const buildWorkoutPlanSystemPrompt = (trainer: {
  name: string;
  specialty: string;
}): string =>
  `
You are ${trainer.name}, a ${trainer.specialty} fitness coach.
Your job is to output ONE valid JSON object for today's workout plan.

Rules:
- Output JSON only. No markdown. No code fences. No numbered lists. No text before or after the JSON.
- Write coachNote and nutritionTip in your coaching voice (brief, motivational).
- Select exercises only from the library provided in the user message.
- Copy exact exerciseId and blockId values from the library (24-character hex strings).
- Do NOT include steps or substitutions — the server adds those automatically.
- Keep mainWork to 4–6 exercises, accessories to 0–3, finisher to 0–2.
`.trim();

const buildFallbackWorkoutPlan = (
  workout: IWorkout,
  trainer: { name: string },
  blocksWithExercises: any[],
) => {
  const flat = blocksWithExercises.flatMap((block) =>
    block.exercises.map((ex: any) => ({
      ...ex,
      blockId: block._id,
      blockName: block.name,
    })),
  );

  const focus = (workout.focusArea || []).map((v) => v.toLowerCase());
  const scored = flat
    .map((ex) => {
      let score = 0;
      const muscleGroup = (ex.muscleGroup || "").toLowerCase();
      if (focus.includes(muscleGroup)) score += 3;
      if (focus.includes("full_body")) score += 1;
      return { ex, score };
    })
    .sort((a, b) => b.score - a.score);

  const mainCount = Math.min(5, Math.max(3, scored.length));
  const main = scored.slice(0, mainCount);
  const accessories = scored.slice(mainCount, mainCount + 2);

  const toPlanExercise = (item: { ex: any; score: number }, order: number) => ({
    exerciseId: item.ex._id.toString(),
    exerciseName: item.ex.name,
    blockId: item.ex.blockId.toString(),
    blockName: item.ex.blockName,
    muscleGroup: item.ex.muscleGroup,
    sets: item.ex.sets,
    reps: item.ex.reps,
    restTime: item.ex.restTime,
    rpe: item.ex.rpe,
    order,
  });

  return {
    coachNote: `${trainer.name} built today's session around your focus: ${workout.focusArea.join(", ")}.`,
    thisWeekFocus: workout.focusArea.slice(0, 3),
    nutritionTip:
      "Stay hydrated and spread protein evenly across meals to support recovery.",
    estimatedDurationMinutes: workout.duration,
    cardioGuidance: null,
    warmUp: [
      {
        order: 1,
        instruction: "5 minutes light cardio plus dynamic stretching",
        duration: "5 minutes",
      },
    ],
    mainWork: main.map((item, index) => toPlanExercise(item, index + 1)),
    accessories: accessories.map((item, index) =>
      toPlanExercise(item, index + 1),
    ),
    finisher: [],
    coolDown: [
      {
        order: 1,
        instruction: "Stretch the muscle groups you trained today",
        duration: "5 minutes",
      },
    ],
    checkInQuestion:
      "Did you complete today's session? What loads did you use and how hard was it (RPE 1-10)? Any pain or equipment issues?",
  };
};

// Build AI prompt from workout preferences + loaded blocks
const buildWorkoutPromptFromPreferences = ({
  user,
  trainer,
  memory,
  workout,
  exerciseBlocks,
}: {
  user: any;
  trainer: any;
  memory: any;
  workout: IWorkout;
  exerciseBlocks: any[];
}): string => {
  const memoryContext = memory
    ? `
PROFILE MEMORY:
- Experience level: ${memory.profileMemory?.experienceLevel || user.fitnessLevel || "unknown"}
- Equipment: ${memory.profileMemory?.equipment || workout.workout_environment.join(", ")}
- Limitations: ${memory.profileMemory?.limitations || "none"}
- Motivation style: ${memory.profileMemory?.motivationStyle || "balanced"}

RECENT SESSION HISTORY (last 3):
${
  memory.rollingMemory?.last3Sessions?.length > 0
    ? memory.rollingMemory.last3Sessions
        .map(
          (s: any, i: number) =>
            `Session ${i + 1} (${new Date(s.date).toLocaleDateString()}): ${s.workoutSummary} | Adherence: ${s.adherence} | RPE: ${s.rpe || "N/A"} | Flags: ${s.flags?.join(", ") || "none"}`,
        )
        .join("\n")
    : "No previous sessions — this is the user's first workout."
}

LAST KNOWN LOADS: ${JSON.stringify(memory.rollingMemory?.lastKnownLoads || {})}
ACTIVE FLAGS: ${memory.rollingMemory?.flags?.join(", ") || "none"}
`
    : "No previous memory. This is the user's first session.";

  // Format blocks for AI — selection fields only (steps/substitutions added server-side)
  const blocksContext = exerciseBlocks.map((block: any) => ({
    blockId: block._id,
    blockName: block.name,
    category: block.category,
    exercises: block.exercises.map((e: any) => ({
      exerciseId: e._id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      difficulty: e.difficulty,
      sets: e.sets,
      reps: e.reps,
      restTime: e.restTime,
      rpe: e.rpe,
      equipment: e.equipment,
      tags: e.tags || [],
    })),
  }));

  return `
USER PROFILE:
- Name: ${user.firstName} ${user.lastName}
- Gender: ${user.gender}
- Fitness level: ${user.fitnessLevel || "intermediate"}
- Height: ${user.height || "N/A"} cm | Weight: ${user.weight || "N/A"} kg
- Injuries: ${user.injuries?.join(", ") || "none"}

TODAY'S WORKOUT PREFERENCES:
- Goal: ${workout.goal.join(", ")}
- Focus area: ${workout.focusArea.join(", ")}
- Environment: ${workout.workout_environment.join(", ")}
- Available equipment: ${workout.equipment_availablity.join(", ")}
- Intensity: ${workout.workout_intensity.join(", ")}
- Duration: ${workout.duration} minutes
- Date: ${new Date(workout.date).toDateString()}

${memoryContext}

TRAINER'S EXERCISE LIBRARY (select ONLY from these blocks):
${JSON.stringify(blocksContext, null, 2)}

TASK:
Generate a personalized workout plan based on the user's preferences above.
Rules:
- Pick exercises ONLY from the trainer's library above
- For each exercise, copy the exact exerciseId and blockId from the library (24-character hex strings)
- Match exercises to today's focusArea and equipment_availablity
- Respect the user's injuries and limitations
- Avoid exercises performed in the last 2 sessions
- Fit within the requested duration (${workout.duration} minutes)
- Match the requested intensity level
- Do NOT include steps or substitutions in your JSON — the server adds those from the library automatically
- Return compact JSON only — no markdown, no commentary

Return ONLY this exact JSON:
{
  "coachNote": "1-2 sentence motivational note for today",
  "thisWeekFocus": ["focus point 1", "focus point 2", "focus point 3"],
  "nutritionTip": "one practical nutrition tip",
  "estimatedDurationMinutes": ${workout.duration},
  "cardioGuidance": "optional cardio note or null",
  "warmUp": [
    { "order": 1, "instruction": "warm up instruction", "duration": "30 seconds" }
  ],
  "mainWork": [
    {
      "exerciseId": "<exact exerciseId from library>",
      "exerciseName": "<exact name from library>",
      "blockId": "<exact blockId from library>",
      "blockName": "<exact blockName from library>",
      "muscleGroup": "muscle group",
      "sets": 3,
      "reps": "8-12",
      "restTime": "60s",
      "rpe": "7-8",
      "order": 1
    }
  ],
  "accessories": [],
  "finisher": [],
  "coolDown": [
    { "order": 1, "instruction": "cool down instruction", "duration": "30 seconds" }
  ],
  "checkInQuestion": "Did you complete today's session? What loads did you use and how hard was it (RPE 1-10)? Any pain or equipment issues?"
}
`;
};

// Map AI-returned exercises → snapshot full data from loaded blocks
const mapPlannedExercises = (
  aiExercises: any[],
  blocksWithExercises: any[],
): IPlannedExercise[] => {
  return aiExercises.map((e: any, index: number) => {
    // Find the source exercise in the loaded blocks
    let sourceExercise: any = null;
    let sourceBlock: any = null;

    for (const block of blocksWithExercises) {
      const found = block.exercises.find(
        (ex: any) =>
          ex._id.toString() === e.exerciseId?.toString() ||
          ex.name === e.exerciseName,
      );
      if (found) {
        sourceExercise = found;
        sourceBlock = block;
        break;
      }
    }

    const exerciseId =
      toObjectIdOrUndefined(e.exerciseId) ??
      toObjectIdOrUndefined(sourceExercise?._id);

    const blockId =
      toObjectIdOrUndefined(e.blockId) ??
      toObjectIdOrUndefined(sourceBlock?._id) ??
      toObjectIdOrUndefined(sourceExercise?.blockId);

    return {
      exerciseId,
      exerciseName: e.exerciseName || sourceExercise?.name,
      blockId,
      blockName: e.blockName || sourceBlock?.name,
      muscleGroup: e.muscleGroup || sourceExercise?.muscleGroup,
      sets: e.sets || sourceExercise?.sets || 3,
      reps: e.reps || sourceExercise?.reps || "8-12",
      restTime: e.restTime || sourceExercise?.restTime || "60s",
      rpe: e.rpe || sourceExercise?.rpe,
      // Snapshot steps and substitutions from source exercise
      steps: sourceExercise?.steps || e.steps || [],
      substitutions: sourceExercise?.substitutions || e.substitutions || {},
      order: e.order ?? index + 1,
      isCompleted: false,
    };
  });
};

/**
 * Finds a matching video from the Content collection based on client workout preferences.
 * Checks title, description, muscleGroups, equipment, and tags.
 */
export const getSuggestedVideo = async (
  workout: IWorkout,
  trainerId: string,
): Promise<string | undefined> => {
  try {
    const focusAreas = (workout.focusArea || []).map((v) => v.toLowerCase());
    const equipmentAvail = (workout.equipment_availablity || []).map((v) => v.toLowerCase());
    const goals = (workout.goal || []).map((v) => v.toLowerCase());

    // 1. Fetch all published, active video content for this trainer
    let videos = await ContentModel.find({
      trainerId,
      contentType: "video",
      isPublished: true,
      isActive: true,
    }).lean();

    // If no videos for this trainer, fallback to other trainers' videos
    if (videos.length === 0) {
      videos = await ContentModel.find({
        contentType: "video",
        isPublished: true,
        isActive: true,
      }).lean();
    }

    if (videos.length === 0) {
      return undefined;
    }

    // 2. Score each video based on matching preferences
    const scoredVideos = videos.map((video) => {
      let score = 0;

      const videoTitle = (video.title || "").toLowerCase();
      const videoDesc = (video.description || "").toLowerCase();
      const videoTags = (video.tags || []).map((t) => t.toLowerCase());
      const videoMuscleGroups = (video.muscleGroups || []).map((m) => m.toLowerCase());
      const videoEquipment = (video.equipment || []).map((e) => e.toLowerCase());

      // Muscle group match: exact match is high value
      focusAreas.forEach((area) => {
        if (videoMuscleGroups.includes(area)) {
          score += 5;
        } else if (videoTitle.includes(area) || videoDesc.includes(area) || videoTags.includes(area)) {
          score += 1;
        }
      });

      // Equipment match
      equipmentAvail.forEach((equip) => {
        if (videoEquipment.includes(equip)) {
          score += 3;
        } else if (videoTitle.includes(equip) || videoDesc.includes(equip) || videoTags.includes(equip)) {
          score += 1;
        }
      });

      // Goal match
      goals.forEach((goal) => {
        if (videoTags.includes(goal)) {
          score += 4;
        } else if (videoTitle.includes(goal) || videoDesc.includes(goal)) {
          score += 2;
        }
      });

      return {
        video,
        score,
      };
    });

    // Sort by score (descending) and then by viewCount (descending) as a tie-breaker
    scoredVideos.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.video.viewCount || 0) - (a.video.viewCount || 0);
    });

    // 3. Return the best matching video's videoUrl if it has one
    const bestMatch = scoredVideos[0];
    return bestMatch?.video?.videoUrl;
  } catch (error) {
    // Gracefully handle errors so workout generation doesn't fail
    console.error("Error finding suggested video:", error);
    return undefined;
  }
};

// ─────────────────────────────────────────────────────────────
// GET TODAY'S WORKOUT OVERVIEW WITH COMPLETION PERCENTAGE
// ─────────────────────────────────────────────────────────────
export const getTodaysWorkoutOverviewService = async (userId: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  // 1. Fetch today's workout for the user
  const workout = await WorkoutModel.findOne({
    userId,
    date: { $gte: start, $lte: end },
  }).lean();

  if (!workout) {
    return null;
  }

  // 2. Count total exercises and completed exercises
  let totalExercises = 0;
  let completedExercises = 0;

  if (workout.aiPlan) {
    const exercises: any[] = [
      ...(workout.aiPlan.mainWork || []),
      ...(workout.aiPlan.accessories || []),
      ...(workout.aiPlan.finisher || []),
    ];

    totalExercises = exercises.length;
    completedExercises = exercises.filter((ex) => ex.isCompleted).length;
  }

  // 3. Calculate percentage
  const completionPercentage =
    totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

  // 4. Return the requested overview
  return {
    workoutId: workout._id,
    goal: workout.goal,
    focusArea: workout.focusArea,
    duration: workout.duration,
    workout_intensity: workout.workout_intensity,
    equipment_availablity: workout.equipment_availablity,
    workout_environment: workout.workout_environment,
    status: workout.status,
    totalExercises,
    completedExercises,
    completionPercentage,
  };
};

// ─────────────────────────────────────────────────────────────
// GET MONTHLY PROGRESSION REPORT (LAST 30 DAYS)
// ─────────────────────────────────────────────────────────────
export const getMonthlyProgressionService = async (userId: string) => {
  const datesList: string[] = [];
  const today = new Date();

  // Generate 30 dates in local server timezone: from 29 days ago up to today
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    datesList.push(`${year}-${month}-${day}`);
  }

  // Query boundaries
  const boundaryStart = new Date();
  boundaryStart.setDate(today.getDate() - 35); // Query wider to catch any boundary workouts
  boundaryStart.setHours(0, 0, 0, 0);

  const boundaryEnd = new Date();
  boundaryEnd.setDate(today.getDate() + 5);
  boundaryEnd.setHours(23, 59, 59, 999);

  // Fetch all workouts for this user in the boundary
  const workouts = await WorkoutModel.find({
    userId,
    date: { $gte: boundaryStart, $lte: boundaryEnd },
  }).lean();

  // Create a map by "YYYY-MM-DD" using UTC methods to safely extract original saved dates without timezone offsets
  const workoutMap: Record<string, any> = {};
  for (const w of workouts) {
    if (w.date) {
      const d = new Date(w.date);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const existing = workoutMap[dateStr];
      // Prioritize completed workouts first, then in-progress, then anything else
      if (!existing) {
        workoutMap[dateStr] = w;
      } else {
        const getPriority = (status: string) => {
          if (status === "completed") return 3;
          if (status === "in_progress") return 2;
          if (status === "pending") return 1;
          return 0;
        };
        if (getPriority(w.status) > getPriority(existing.status)) {
          workoutMap[dateStr] = w;
        }
      }
    }
  }

  // Map dates sequentially to construct the 30-day report
  return datesList.map((dateStr) => {
    const workout = workoutMap[dateStr];

    if (!workout) {
      return {
        date: dateStr,
        totalExercises: 0,
        completedExercises: 0,
        completionPercentage: 0,
      };
    }

    let totalExercises = 0;
    let completedExercises = 0;

    if (workout.aiPlan) {
      const exercises: any[] = [
        ...(workout.aiPlan.mainWork || []),
        ...(workout.aiPlan.accessories || []),
        ...(workout.aiPlan.finisher || []),
      ];

      totalExercises = exercises.length;
      completedExercises = exercises.filter((ex: any) => ex.isCompleted).length;
    }

    const completionPercentage =
      totalExercises > 0
        ? Math.round((completedExercises / totalExercises) * 100)
        : 0;

    return {
      date: dateStr,
      totalExercises,
      completedExercises,
      completionPercentage,
    };
  });
};

