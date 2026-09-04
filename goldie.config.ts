const config = {
  appRoot: ".", 
  
  android: {
    appPath: "./frontend/android/app/release/app-release.apk",
    applicationId: "com.streaksphere",
  },

  devices: ["pixel-10-pro"], 
  locales: ["en-US"],
  appearance: "dark", // Switched to dark appearance to match the vibrant purple app icon aesthetic
  frame: { variant: "17-pro-blue" },

  theme: {
    // Rich purple-to-indigo gradient matching your StreakSphere brand & primary accent (#7C3AED)
    background: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 55%, #1E1B4B 100%)",
    headlineColor: "#FFFFFF",
    subheadColor: "#E2E8F0",
    fontFamily: '-apple-system, system-ui, sans-serif',
    layout: "classic",
  },

  store: {
    name: "StreakSphere",
    subtitle: { "en-US": "Build Together. Feel the World." },
    developer: "StreakSphere Inc.",
    category: "Social",
    rating: 5.0,
    ratingCount: "1.2K Ratings",
    price: "Free",
    description: { "en-US": "AR Chat, Live Moods, Relationship Streaks, AI-Verified Activity Competition, and the Global Activity Feed." },
  },

  scenes: [
    {
      kind: "screenshot",
      id: "feed",
      flow: "store-01-feed",
      headline: { "en-US": "The Pulse of Your World." },
      subhead: { "en-US": "Discover what your friends and the world are up to." },
      layout: "panorama", 
      secondScene: "moods",
    },
    {
      kind: "screenshot",
      id: "moods",
      flow: "store-02-moods",
      headline: { "en-US": "Never Guess How They Feel." },
      subhead: { "en-US": "Real-time relationship pills and mood clouds." },
      layout: "hero",
    },
    {
      kind: "screenshot",
      id: "archat",
      flow: "store-03-archat",
      headline: { "en-US": "Create memories in 3D" },
      subhead: { "en-US": "Break out of the 2D screen into 3D." },
      layout: "hero",
    },
    {
      kind: "screenshot",
      id: "aiproof",
      flow: "store-04-aiproof",
      headline: { "en-US": "Upload your post" },
      subhead: { "en-US": "Post on world or friends tabs and get points." },
      layout: "tilt",
    },
    {
      kind: "screenshot",
      id: "streaks",
      flow: "store-05-streaks",
      headline: { "en-US": "Dominate the Board." },
      subhead: { "en-US": "Build streaks and climb the global leaderboards." },
      layout: "hero",
    }
  ],
};

export default config;