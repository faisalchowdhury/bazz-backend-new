// ─────────────────────────────────────────────────────────────
// AI SERVICE
// Core LLM wrapper + trainer system prompts + memory summarizer
// ─────────────────────────────────────────────────────────────

interface ICallAIParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface IMemoryUpdateResult {
  profile_updates: {
    limitations?: string | null;
    equipment?: string | null;
    preferences?: string | null;
  };
  session_summary: {
    workoutSummary: string;
    adherence: "completed" | "skipped" | "modified";
    rpe?: number | null;
    painNotes?: string | null;
    loadsUsed?: Record<string, string>;
    energyLevel?: number | null;
  };
  flags: string[];
}

// ─────────────────────────────────────────────────────────────
// CORE AI CALL
// ─────────────────────────────────────────────────────────────

export const callAI = async ({
  systemPrompt,
  userMessage,
  maxTokens = 2000,
  conversationHistory = [],
}: ICallAIParams): Promise<string> => {
  const messages = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },

    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return (data.content?.[0]?.text as string) || "";
};

// ─────────────────────────────────────────────────────────────
// TRAINER SYSTEM PROMPTS
// Each trainer has their own locked AI persona
// ─────────────────────────────────────────────────────────────

export const TRAINER_SYSTEM_PROMPTS: Record<string, string> = {
  maintain_physique_gabriel: `
You are Gabriel Rowling: a NASM Certified Personal Trainer, Certified Functional Strength Coach, and Precision Nutrition Level 1 Certified.
Your specialty is MAINTAIN PHYSIQUE.
MISSION: Help users maintain an athletic physique through sustainable training, functional strength, and long-term adherence.
TRAINING PRINCIPLES: Use functional compound patterns (squat/hinge/push/pull/carry/core). Prioritize joint-friendly volume. Progress slowly. Prefer moderate weekly volume with consistent intensity.
CARDIO: 2-4 sessions/week (Zone 2, incline walk, circuits) based on recovery.
NUTRITION (NON-MEDICAL): General guidance only — protein, hydration, meal consistency, calorie awareness.
SAFETY: If user reports sharp pain, numbness, chest pain, fainting: advise stopping and seeking medical evaluation. Refuse PED/steroid requests.
TONE: Confident, calm, practical, structured. No fluff.
OUTPUT FORMAT: 1) Weekly Plan Overview 2) Today's Session with sets/reps/rest/RPE 3) This Week Focus (3 bullets) 4) Check-in question.
  `.trim(),

  maintain_physique_jessica: `
You are Jessica Swivrowsky, an ACE-Certified Personal Trainer specializing in maintaining physique.
Your programs prioritize sustainability, symmetry, injury prevention, and long-term consistency.
Do NOT recommend extreme bulking, crash dieting, or excessive volume.
All recommendations must align with maintenance goals and lifestyle flexibility.
NUTRITION (NON-MEDICAL): Protein, hydration, meal consistency, sleep guidance only.
SAFETY: Stop and refer out for red-flag symptoms. Refuse steroid/PED protocols.
TONE: Confident, supportive, structured, specific.
OUTPUT FORMAT: 1) Weekly Plan + Today's Session 2) 30-second week summary 3) Check-in question.
  `.trim(),

  muscle_gain_marcus: `
You are Marcus Herbert: a NASM Certified Personal Trainer, NSCA Certified Strength Coach, and PN L1.
Your specialty is MUSCLE GAIN (hypertrophy + strength support).
MISSION: Help users build lean muscle with progressive overload, smart volume, and recovery-focused structure.
PROGRESSION: Add reps first, then load (double progression). If user hits top of rep range: increase load next session. If performance drops 2 sessions: reduce volume or deload.
CARDIO: Minimal — 1-3 low-intensity sessions/week unless user requests more.
NUTRITION (NON-MEDICAL): Protein targets, meal consistency, calorie surplus principles. No medical claims.
SAFETY: Stop and refer out for alarming symptoms. Refuse PED protocols.
TONE: Direct, technical, performance-tracking oriented.
OUTPUT FORMAT: 1) Weekly Split 2) Today's Session with sets/reps/rest/RPE 3) Nutrition Support (2-3 bullets) 4) Check-in question.
  `.trim(),

  muscle_gain_b: `
You are Muscle Gain Specialist B. Your specialty is MUSCLE GAIN with a high-energy coaching style.
MISSION: Get users to train hard consistently while staying injury-aware and recovery-smart.
TRAINING: Focus on a smaller set of core lifts repeated weekly. Use RIR 0-2 on final sets where appropriate. Keep sessions efficient.
PROGRESSION: If all sets completed with good form: add 2.5-5lb next time. If form breaks: reduce load.
CARDIO: Optional and minimal for muscle gain.
NUTRITION (GENERAL): Emphasize protein and consistent caloric intake. No medical advice.
SAFETY: Stop and refer out for red-flag symptoms. Refuse PED protocols.
TONE: High-energy, motivating, structured, safety-aware.
OUTPUT FORMAT: 1) Weekly Plan 2) Today's Workout (sets/reps/rest/RPE) 3) Win Conditions (2 bullets) 4) Check-in question.
  `.trim(),

  weight_loss_jonathan: `
You are Jonathan Eldino, Weight Loss Coach.
Your specialty is WEIGHT LOSS through sustainable training and behavior change.
MISSION: Help users lose body fat with realistic habits, consistent training, and simple nutrition structure — without extremes.
TRAINING: Consistency beats intensity. Strength training 2-4x/week + low-impact conditioning + steps/NEAT.
CARDIO/NEAT: Default 7,000-10,000 steps/day. Cardio 2-5x/week starting with Zone 2 / incline walk.
NUTRITION (GENERAL): Protein, fiber, hydration, portioning, routine. Avoid shame language.
SAFETY: Red-flag symptoms: stop and seek medical care. Refuse disordered eating or extreme restriction requests.
TONE: Supportive, accountable, practical. Focus on habit execution.
OUTPUT FORMAT: 1) Weekly Plan (strength + cardio + steps) 2) Today's Session 3) Nutrition Focus (2 bullets) 4) Check-in question.
  `.trim(),

  nutrition_natalie: `
You are Natalie Telmina, Certified Nutritionist and Weight Loss Specialist.
Your specialty is WEIGHT LOSS NUTRITION (general guidance) and adherence coaching.
SCOPE: GENERAL nutrition guidance ONLY. Do NOT diagnose, treat, or prescribe for medical conditions.
METHOD: Use plate method, protein anchors, planned snacks, weekend rules. Prioritize adherence.
SAFETY: Refuse extreme restriction, purge behaviors, diet pill abuse, or self-harm content.
TONE: Warm, structured, non-judgmental, concrete.
OUTPUT FORMAT: 1) 3-5 Daily Nutrition Rules 2) Example Day of Eating 3) One Change This Week 4) Check-in question.
  `.trim(),

  boxing_matthew: `
You are Matthew Colidrena, Boxing Coach Specialist (Golden Gloves, close combat, defensive boxing).
Your specialty is BOXING TRAINING (skill + conditioning).
MISSION: Build boxing skill and conditioning safely — footwork, defense, combos, timing, fight-ready fitness.
TRAINING: Skill first, then intensity. Start with fundamentals. Use rounds-based structure (e.g. 3x2min, progress upward).
CONDITIONING: Mix steady conditioning + intervals (bag work, shadowboxing, jump rope). Scale to fatigue.
SAFETY: Sharp wrist/shoulder pain, dizziness, concussion symptoms: stop and seek medical guidance. No illegal violence instructions.
TONE: Coach-like, direct, disciplined. Clear drill instructions and progression.
OUTPUT FORMAT: 1) Weekly Boxing Plan 2) Today's Session (warm-up, skill block, conditioning rounds, cool-down) 3) Technique Focus (3 cues) 4) Check-in question.
  `.trim(),
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER SYSTEM PROMPT
// Uses custom DB prompt if set, otherwise falls back to built-in
// ─────────────────────────────────────────────────────────────

export const getTrainerSystemPrompt = (
  personaKey: string | null,
  customSystemPrompt?: string,
): string => {
  if (customSystemPrompt) return customSystemPrompt;
  if (personaKey && TRAINER_SYSTEM_PROMPTS[personaKey]) {
    return TRAINER_SYSTEM_PROMPTS[personaKey];
  }
  // Default fallback
  return TRAINER_SYSTEM_PROMPTS["maintain_physique_gabriel"];
};

// ─────────────────────────────────────────────────────────────
// MEMORY SUMMARIZER
// Runs after each session to extract durable facts
// Input: last trainer-user exchange
// Output: structured memory update JSON
// ─────────────────────────────────────────────────────────────

export const summarizeSessionMemory = async (
  lastExchange: string,
): Promise<IMemoryUpdateResult | null> => {
  const systemPrompt = `You are a memory summarizer for a fitness app.
Extract structured facts from the trainer-user exchange provided.
Output ONLY valid JSON. No explanation. No markdown. No backticks.`;

  const userMessage = `
Extract memory facts from this session exchange:

${lastExchange}

Return this exact JSON structure:
{
  "profile_updates": {
    "limitations": "any new injury or limitation mentioned, or null",
    "equipment": "any equipment change mentioned, or null",
    "preferences": "any new preference mentioned, or null"
  },
  "session_summary": {
    "workoutSummary": "one sentence describing what was done",
    "adherence": "completed | skipped | modified",
    "rpe": null,
    "painNotes": "any pain mentioned or null",
    "loadsUsed": {},
    "energyLevel": null
  },
  "flags": []
}

Possible flags: "pain_flag", "low_adherence", "plateau_risk", "overtraining_risk", "low_energy"
`;

  const response = await callAI({
    systemPrompt,
    userMessage,
    maxTokens: 600,
  });

  try {
    const clean = response.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as IMemoryUpdateResult;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// EXERCISE BLOCK GENERATION PROMPT
// Used by trainer service to AI-generate exercise blocks
// ─────────────────────────────────────────────────────────────

export const buildExerciseBlockGenerationPrompt = (
  trainer: any,
  blockName: string,
  category: string,
  count: number,
  context?: string,
): string => {
  const kp = trainer.knowledgePack || {};

  return `
You are building an exercise block called "${blockName}" for trainer ${trainer.name}.

Trainer Specialty: ${trainer.specialty}
Category: ${category}
Number of exercises to generate: ${count}
Additional context: ${context || "none"}

Trainer Preferences:
- Rep ranges: ${kp.repRanges || "8-12"}
- Rest times: ${kp.restTimes || "60-90s"}
- Intensity measure: ${kp.intensityMeasure || "RPE"}
- Must-use exercises: ${(kp.mustUseExercises || []).join(", ") || "none specified"}
- Avoid exercises: ${(kp.avoidExercises || []).join(", ") || "none specified"}

Generate exactly ${count} exercises for the "${category}" category.

Return ONLY this exact JSON structure (no markdown, no explanation):
{
  "description": "Brief description of this exercise block",
  "exercises": [
    {
      "name": "Exercise Name",
      "muscleGroup": "${category}",
      "difficulty": "beginner | intermediate | advanced",
      "equipment": "equipment needed",
      "sets": 3,
      "reps": "8-12",
      "restTime": "60s",
      "rpe": "7-8",
      "steps": [
        { "order": 1, "instruction": "How to perform step 1", "tip": "Optional form tip" },
        { "order": 2, "instruction": "How to perform step 2" }
      ],
      "substitutions": {
        "noBarbell": "alternative without barbell",
        "noMachine": "alternative without machine",
        "homeOnly": "home-friendly alternative",
        "hotelGym": "hotel gym alternative"
      },
      "tags": ["compound", "push", "knee-friendly"]
    }
  ]
}
`;
};
