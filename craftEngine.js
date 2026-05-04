export const craftEngine = {
  startBuild: async (craft) => {
    const res = await fetch("/api/craft/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ craft }),
    });

    return res.json();
  },

  updateBuild: async (buildId, selections) => {
    const res = await fetch("/api/craft/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ buildId, selections }),
    });

    return res.json();
  },

  checkTimer: async (buildId) => {
    const res = await fetch(`/api/craft/check/${buildId}`);
    return res.json();
  },
};