import { Types } from "mongoose";
import {
  IAIGeneratedPlan,
  IPlannedExercise,
  IWorkout,
} from "./workoutGoal.interface";
import { WorkoutModel } from "./workoutGoal.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { ExerciseBlockModel } from "../exerciseBlock/exerciseBlock.model";
import { ExerciseModel } from "../exercise/exercise.model";
import { ExerciseStepModel } from "../exerciseStep/exerciseStep.model";
import {
  callAI,
  getTrainerSystemPrompt,
  summarizeSessionMemory,
} from "../../services/ai.service";

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
    throw new Error("Trainer has no approved exercise blocks yet");
  }

  // 6. Load exercises + steps for each block from separate collections
  const blocksWithExercises = await Promise.all(
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
  );

  // 7. Build AI prompt
  const userMessage = buildWorkoutPromptFromPreferences({
    user,
    trainer,
    memory,
    workout,
    exerciseBlocks: blocksWithExercises,
  });

  // 8. Get trainer system prompt
  const systemPrompt = getTrainerSystemPrompt(null, trainer.systemPrompt);

  // 9. Call AI
  const aiResponse = await callAI({
    systemPrompt:
      systemPrompt +
      "\n\nIMPORTANT: Output ONLY valid JSON. No explanation. No markdown.",
    userMessage,
    maxTokens: 3500,
  });

  // 10. Parse AI response
  let plan: any;
  try {
    const clean = aiResponse.replace(/```json|```/g, "").trim();
    plan = JSON.parse(clean);
  } catch {
    throw new Error("AI returned invalid plan. Please try again.");
  }

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

  // 1. Mark session complete
  workout.status = "completed";
  workout.completedAt = new Date();
  workout.actualDurationMinutes = actualDurationMinutes;
  workout.aiPlan.checkInResponse = checkInResponse;
  workout.aiPlan.checkInRespondedAt = new Date();
  workout.markModified("aiPlan");
  await workout.save();

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
    rpe: memoryUpdate.session_summary?.rpe,
    painNotes: memoryUpdate.session_summary?.painNotes,
    energyLevel: memoryUpdate.session_summary?.energyLevel,
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
    sessionRpe: memoryUpdate.session_summary?.rpe,
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

  // Format blocks for AI — only what the AI needs to select exercises
  const blocksContext = exerciseBlocks.map((block: any) => ({
    blockId: block._id,
    blockName: block.name,
    category: block.category,
    exercises: block.exercises.map((e: any) => ({
      id: e._id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      difficulty: e.difficulty,
      sets: e.sets,
      reps: e.reps,
      restTime: e.restTime,
      rpe: e.rpe,
      equipment: e.equipment,
      tags: e.tags || [],
      steps: e.steps || [],
      substitutions: e.substitutions || {},
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
- Match exercises to today's focusArea and equipment_availablity
- Respect the user's injuries and limitations
- Avoid exercises performed in the last 2 sessions
- Fit within the requested duration (${workout.duration} minutes)
- Match the requested intensity level
- Always copy the full steps and substitutions from the library into the plan

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
      "exerciseId": "id from library",
      "exerciseName": "name",
      "blockId": "block id",
      "blockName": "block name",
      "muscleGroup": "muscle group",
      "sets": 3,
      "reps": "8-12",
      "restTime": "60s",
      "rpe": "7-8",
      "order": 1,
      "steps": [],
      "substitutions": {},
      "isCompleted": false
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
    for (const block of blocksWithExercises) {
      const found = block.exercises.find(
        (ex: any) =>
          ex._id.toString() === e.exerciseId?.toString() ||
          ex.name === e.exerciseName,
      );
      if (found) {
        sourceExercise = found;
        break;
      }
    }

    return {
      exerciseId: e.exerciseId ? new Types.ObjectId(e.exerciseId) : undefined,
      exerciseName: e.exerciseName,
      blockId: e.blockId ? new Types.ObjectId(e.blockId) : undefined,
      blockName: e.blockName,
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
