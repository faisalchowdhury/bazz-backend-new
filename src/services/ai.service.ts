// ─────────────────────────────────────────────────────────────
// AI SERVICE
// Core LLM wrapper + trainer system prompts + memory summarizer
// ─────────────────────────────────────────────────────────────

import { BUILT_IN_TRAINER_SYSTEM_PROMPTS } from "../DB/builtInTrainers.data";

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
  ...BUILT_IN_TRAINER_SYSTEM_PROMPTS,
  // Legacy alias
  muscle_gain_b: BUILT_IN_TRAINER_SYSTEM_PROMPTS.muscle_gain_ryan,
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
