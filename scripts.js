(() => {
  "use strict";

  const API_BASE = "https://mansik-santulan-score-t3ru.onrender.com";

  // Elements
  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeLabel = document.getElementById("theme-label");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const metricsPills = document.getElementById("metrics-pills");
  const gaugeFill = document.getElementById("gauge-fill");
  const errorCopyEl = document.getElementById("error-copy");

  const GAUGE_ARC_LENGTH = 314;

  // Preset Data
  const presets = {
    balanced: { age: 21, gender: "Female", country: "India", academic_level: "Undergraduate", most_used_platform: "Instagram", purpose_of_use: "Entertainment", avg_daily_usage_hours: 4.5, daily_unlocks: 65, study_hours: 5.0, physical_activity_hours: 1.0, sleep_hours_per_night: 7.0, stress_level: "Medium" },
    exam: { age: 22, gender: "Male", country: "USA", academic_level: "Graduate", most_used_platform: "YouTube", purpose_of_use: "Education", avg_daily_usage_hours: 7.0, daily_unlocks: 110, study_hours: 9.0, physical_activity_hours: 0.2, sleep_hours_per_night: 4.5, stress_level: "Very High" },
    scroller: { age: 18, gender: "Female", country: "UK", academic_level: "High School", most_used_platform: "TikTok", purpose_of_use: "Entertainment", avg_daily_usage_hours: 8.5, daily_unlocks: 140, study_hours: 3.0, physical_activity_hours: 0.5, sleep_hours_per_night: 5.5, stress_level: "High" },
    athlete: { age: 21, gender: "Male", country: "Canada", academic_level: "Undergraduate", most_used_platform: "LinkedIn", purpose_of_use: "Networking", avg_daily_usage_hours: 2.0, daily_unlocks: 30, study_hours: 4.5, physical_activity_hours: 2.0, sleep_hours_per_night: 8.0, stress_level: "Low" }
  };

  // 1. Light/Dark Mode Toggle
  function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.body.classList.add("dark");
      themeLabel.textContent = "Dark Mode";
    } else {
      document.body.classList.remove("dark");
      themeLabel.textContent = "Light Mode";
    }
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeLabel.textContent = isDark ? "Dark Mode" : "Light Mode";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  initTheme();

  // 2. Draw Gauge Ticks
  function drawTicks() {
    document.querySelectorAll(".gauge-ticks").forEach((g) => {
      g.innerHTML = "";
      const cx = 120, cy = 140, rOuter = 100, rInner = 90;
      for (let i = 0; i <= 10; i += 2) {
        const angle = Math.PI - (i / 10) * Math.PI;
        const x1 = cx + rOuter * Math.cos(angle);
        const y1 = cy - rOuter * Math.sin(angle);
        const x2 = cx + rInner * Math.cos(angle);
        const y2 = cy - rInner * Math.sin(angle);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));
        g.appendChild(line);
      }
    });
  }
  drawTicks();

  // 3. Stress Level Segmented Control
  const segGroup = document.getElementById("stress_level_group");
  const stressInput = document.getElementById("stress_level");

  segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      segGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      stressInput.value = btn.dataset.value;
    });
  });

  // 4. Preset Buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const p = presets[btn.dataset.preset];
      if (p) {
        Object.keys(p).forEach((key) => {
          const field = document.getElementById(key);
          if (field) field.value = p[key];
        });
        segGroup.querySelectorAll(".seg-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.value === p.stress_level);
        });
      }
    });
  });

  // 5. Calculate Fallback Analytics
  function calculateFallback(payload) {
    let score = 10.0;
    const sleep = payload.sleep_hours_per_night || 7;
    const screen = payload.avg_daily_usage_hours || 4;
    const stress = payload.stress_level;

    let sleepImpact = sleep < 7 ? -((7 - sleep) * 1.2) : 0.5;
    let screenImpact = screen > 4 ? -((screen - 4) * 0.45) : 0.3;
    let stressImpact = stress === "Very High" ? -3.2 : stress === "High" ? -2.0 : -0.8;

    score = Math.max(1.0, Math.min(9.8, score + sleepImpact + screenImpact + stressImpact));
    return {
      score: Number(score.toFixed(2)),
      sleepImpact: sleepImpact.toFixed(1),
      screenImpact: screenImpact.toFixed(1),
      stressImpact: stressImpact.toFixed(1)
    };
  }

  // 6. UI State Management
  function showState(name) {
    [stateIdle, stateLoading, stateResult, stateError].forEach((el) => (el.hidden = true));
    ({ idle: stateIdle, loading: stateLoading, result: stateResult, error: stateError }[name]).hidden = false;
  }

  function renderResult(score, metrics) {
    scoreNumberEl.textContent = score.toFixed(2);
    scoreBandEl.textContent = score < 4.5 ? "Signal: Strained Baseline" : score < 7.2 ? "Signal: Balanced Rhythm" : "Signal: Resilient & Strong";
    scoreContextEl.textContent = score < 4.5 ? "High physiological strain detected. Prioritize sleep and screen breaks." : "Your current rhythm looks steady and resilient.";

    metricsPills.innerHTML = `
      <span class="pill-item">SLEEP: ${metrics.sleepImpact >= 0 ? '+' : ''}${metrics.sleepImpact}</span>
      <span class="pill-item">SCREEN: ${metrics.screenImpact >= 0 ? '+' : ''}${metrics.screenImpact}</span>
      <span class="pill-item">STRESS: ${metrics.stressImpact >= 0 ? '+' : ''}${metrics.stressImpact}</span>
    `;

    gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH * (1 - Math.min(10, score) / 10));
    showState("result");
  }

  // 7. Form Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showState("loading");

    const payload = {
      age: parseInt(document.getElementById("age").value, 10),
      gender: document.getElementById("gender").value,
      country: document.getElementById("country").value,
      academic_level: document.getElementById("academic_level").value,
      most_used_platform: document.getElementById("most_used_platform").value,
      purpose_of_use: document.getElementById("purpose_of_use").value,
      avg_daily_usage_hours: parseFloat(document.getElementById("avg_daily_usage_hours").value),
      daily_unlocks: parseInt(document.getElementById("daily_unlocks").value, 10),
      study_hours: parseFloat(document.getElementById("study_hours").value),
      physical_activity_hours: parseFloat(document.getElementById("physical_activity_hours").value),
      sleep_hours_per_night: parseFloat(document.getElementById("sleep_hours_per_night").value),
      stress_level: stressInput.value
    };

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const metrics = calculateFallback(payload);
        renderResult(data.predicted_mental_health_score, metrics);
      } else {
        throw new Error("Server error");
      }
    } catch (err) {
      // Fallback local calculation if backend is unreachable
      const fallback = calculateFallback(payload);
      renderResult(fallback.score, fallback);
    }
  });

  resetBtn.addEventListener("click", () => showState("idle"));
  errorRetryBtn.addEventListener("click", () => showState("idle"));
})();
