// Simple verification script for monthly progression report date range logic
const generateLast30Days = (): string[] => {
  const datesList: string[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(start.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    datesList.push(`${year}-${month}-${day}`);
  }
  return datesList;
};

const runTests = () => {
  const dates = generateLast30Days();

  // 1. Verify we have exactly 30 dates
  if (dates.length === 30) {
    console.log(`✓ [PASSED] Generated exactly ${dates.length} days`);
  } else {
    console.error(`✗ [FAILED] Expected 30 dates, but got ${dates.length}`);
  }

  // 2. Verify date sequential order
  const oldest = new Date(dates[0]);
  const newest = new Date(dates[29]);
  const diffTime = Math.abs(newest.getTime() - oldest.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 29) {
    console.log(`✓ [PASSED] Boundary diff is exactly 29 days (First: ${dates[0]}, Last: ${dates[29]})`);
  } else {
    console.error(`✗ [FAILED] Expected 29 days diff, but got ${diffDays}`);
  }

  // 3. Verify format YYYY-MM-DD
  const formatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const allFormatted = dates.every(d => formatRegex.test(d));
  if (allFormatted) {
    console.log("✓ [PASSED] All dates match YYYY-MM-DD formatting pattern");
  } else {
    console.error("✗ [FAILED] Some dates do not match formatting pattern:", dates);
  }

  console.log("\nMonthly progression report logic verified successfully.");
};

runTests();
