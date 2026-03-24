// ------------------------
// app.js
// ------------------------

let userKey = localStorage.getItem("workout_key");

if (!userKey) {
  setTimeout(() => {
    userKey = prompt("Enter your key:");
    if (userKey) {
      localStorage.setItem("workout_key", userKey);
      location.reload();
    }
  }, 500);
}

let state = { exercises: [] };

// ------------------------
// Load Data from Google Apps Script
// ------------------------
async function loadData() {
  try {
    const url = getScriptURL();
    console.log("Fetching:", url);

    const res = await fetch(url);
    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("DATA:", data);

    // Show current day in the title
    document.getElementById("title").innerText = data.day || "Workout";

    // Ensure exercises is always an array
    let exercises = Array.isArray(data.next) ? data.next : [];

    // ====== FILTER BY DAY ======
    // Only show exercises that match the current day from server
    exercises = exercises.filter(ex => !ex.day || ex.day === data.day);
    // ===========================

    state.exercises = exercises;

    if (!state.exercises.length) {
      console.warn("No exercises returned for today.");
    }

    render();
  } catch (err) {
    console.error("LOAD ERROR:", err);
    document.getElementById("title").innerText = "Error loading data";
    state.exercises = [];
  }
}

// ------------------------
// Render Exercises
// ------------------------
function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (!state.exercises.length) {
    app.innerHTML = "<p>No exercises scheduled today.</p>";
    return;
  }

  state.exercises.forEach((ex, i) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="inner">
        <h3>${ex.name || "Unnamed Exercise"}</h3>
        <canvas id="c-${i}"></canvas>
        <div>Suggested: ${ex.weight ?? "-"}</div>
        <input id="w-${i}" value="${ex.weight ?? ""}">
        <input id="r-${i}" value="${ex.reps ?? ""}">
        <button onclick="logSet(${i})">Log</button>
      </div>
    `;

    app.appendChild(card);
    buildChart(i, ex.history);
  });
}

// ------------------------
// Build Chart.js chart
// ------------------------
function buildChart(i, history) {
  if (!history || !Array.isArray(history) || !history.length) return;

  new Chart(document.getElementById(`c-${i}`), {
    type: "line",
    data: {
      labels: history.map(h => h.d),
      datasets: [{ data: history.map(h => h.v) }]
    }
  });
}

// ------------------------
// Log a Set
// ------------------------
async function logSet(i) {
  const ex = state.exercises[i];
  if (!ex) return;

  const payload = {
    action: "log",
    exercise: ex.name,
    weight: Number(document.getElementById(`w-${i}`).value),
    reps: Number(document.getElementById(`r-${i}`).value),
    timestamp: Date.now()
  };

  try {
    await sendLog(payload);
  } catch {
    queueLog(payload);
  }

  loadData();
}

// ------------------------
// Install Prompt (PWA)
// ------------------------
let deferredPrompt;
window.addEventListener("DOMContentLoaded", () => {
  loadData();
  flushQueue();
});

// ------------------------
// Utilities
// ------------------------
function getUserKey() {
  let key = localStorage.getItem("workout_key");
  if (!key) {
    key = prompt("Enter your key:");
    if (key) localStorage.setItem("workout_key", key);
  }
  return key;
}

function getScriptURL() {
  const key = getUserKey();
  return `https://script.google.com/macros/s/AKfycbxAP0EAtNUCVj97wxyUZJqQf1XHlv9XFFbbit1HBLIWY-8t0c1DZWqS-PXBDuSGB5jX5Q/exec?key=${key}`;
}
