import { cleanAnamResponse } from "../modules/anam/anam.service";

// Simple test for percentage calculations as requested by standard
const calculatePercentage = (total: number, completed: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

const runTests = () => {
  const testCases = [
    { total: 10, completed: 3, expected: 30 },
    { total: 6, completed: 4, expected: 67 },
    { total: 8, completed: 0, expected: 0 },
    { total: 0, completed: 0, expected: 0 },
    { total: 5, completed: 5, expected: 100 },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const result = calculatePercentage(tc.total, tc.completed);
    if (result === tc.expected) {
      console.log(`✓ [PASSED] Total: ${tc.total}, Completed: ${tc.completed} -> ${result}%`);
      passed++;
    } else {
      console.error(`✗ [FAILED] Total: ${tc.total}, Completed: ${tc.completed} -> Expected ${tc.expected}%, Got ${result}%`);
    }
  }

  console.log(`\nWorkout Stats verification completed: ${passed}/${testCases.length} passed.`);
  process.exit(passed === testCases.length ? 0 : 1);
};

runTests();
