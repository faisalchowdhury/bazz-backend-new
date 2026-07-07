import { cleanAnamResponse } from "../modules/anam/anam.service";

const runTests = () => {
  const multilineInput = `\`\`\`json
{
  "response": "Absolutely, great question — and honestly the most important thing you can dial in right now as a beginner.

I actually have a video that covers everything you need. Go check out my video called 'Perfect Bench Press Form — Full Tutorial' in the app. It walks you through grip width, shoulder retraction, bar path, foot position — all of it.

But let me give you the quick version right now. Five key points — feet flat on the floor, back slightly arched with shoulder blades pinched together, grip just outside shoulder width, bar comes down to your mid-chest in a controlled way, and you press it back up and slightly back toward your face. Not straight up — think of it like a slight diagonal.

The biggest mistake I see beginners make is letting the shoulders flare out and creep forward. That's where injuries start. So watch that video, take your time with it, and next session go lighter and really apply those cues. Sound good?"
}
\`\`\``;

  const expected = "Absolutely, great question — and honestly the most important thing you can dial in right now as a beginner. " +
    "I actually have a video that covers everything you need. Go check out my video called 'Perfect Bench Press Form — Full Tutorial' in the app. It walks you through grip width, shoulder retraction, bar path, foot position — all of it. " +
    "But let me give you the quick version right now. Five key points — feet flat on the floor, back slightly arched with shoulder blades pinched together, grip just outside shoulder width, bar comes down to your mid-chest in a controlled way, and you press it back up and slightly back toward your face. Not straight up — think of it like a slight diagonal. " +
    "The biggest mistake I see beginners make is letting the shoulders flare out and creep forward. That's where injuries start. So watch that video, take your time with it, and next session go lighter and really apply those cues. Sound good?";

  const result = cleanAnamResponse(multilineInput);
  if (result === expected) {
    console.log("✓ [PASSED] Multiline newline flattening test!");
  } else {
    console.error("✗ [FAILED] Multiline newline flattening test!");
    console.error(`Result length: ${result.length}, Expected length: ${expected.length}`);
    console.error("Result:\n" + result);
  }
};

runTests();
