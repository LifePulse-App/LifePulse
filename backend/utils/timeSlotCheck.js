export const getTimeSlotForDate = (date = new Date()) => {
    const hour = date.getHours(); // 0-23
  
    if (hour >= 5 && hour < 12) return "morning";     // 5:00 - 11:59
    if (hour >= 12 && hour < 17) return "afternoon";  // 12:00 - 16:59
    if (hour >= 17 && hour < 20) return "evening";    // 17:00 - 19:59
    return "night";                                   // 21:00 - 4:59
  };