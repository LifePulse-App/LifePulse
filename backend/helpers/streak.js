export const getStreakTitle = (count) => {
    if (count >= 365) return "Legendary Streak Master";
    if (count >= 300) return "Yearly Streak Champion";
    if (count >= 180) return "Half-Year Hero";
    if (count >= 90) return "Quarter-Year Achiever";
    if (count >= 60) return "Two-Month Streaker";
    if (count >= 30) return "Monthly Motivator";
    if (count >= 14) return "Fortnight Fighter";
    if (count >= 7) return "Weekly Warrior";
    if (count >= 3) return "Rising Star";
    if (count >= 1) return "Getting Started";
    return "Keep Going!";
  };
  