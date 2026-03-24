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

let state = { exercises: [], currentCard: 0 };

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

    // Filter exercises for current day
    exercises = exercises.filter(ex => !ex.day || ex.day === data.day);

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
    document.getElementById("pagination").innerHTML = "";
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

  // Show first card and render pagination
  state.currentCard = 0;
  showCard(0);
  renderPagination();
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
// Pagination Functions
// ------------------------
function renderPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  state.exercises.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (i === state.currentCard ? " active" : "");
    dot.addEventListener("click", () => showCard(i));
    pagination.appendChild(dot);
  });
}

function showCard(index) {
  state.currentCard = index;
  const app = document.getElementById("app");
  app.style.transform = `translateX(-${index * 100}vw)`;

  document.querySelectorAll(".dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

// ------------------------
// Touch Swipe Support
// ------------------------
let startX = 0;
let isDragging = false;

const carousel = document.getElementById("app");

carousel.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  isDragging = true;
});

carousel.addEventListener("touchmove", e => {
  if (!isDragging) return;
  const currentX = e.touches[0].clientX;
  const diff = startX - currentX;

  // Optional: live drag effect
  // carousel.style.transform = `translateX(${-state.currentCard * 100 - diff / window.innerWidth * 100}vw)`;
});

carousel.addEventListener("touchend", e => {
  if (!isDragging) return;
  isDragging = false;

  const endX = e.changedTouches[0].clientX;
  const diff = startX - endX;

  if (diff > 50 && state.currentCard < state.exercises.length - 1) {
    // swipe left → next card
    showCard(state.currentCard + 1);
  } else if (diff < -50 && state.currentCard > 0) {
    // swipe right → previous card
    showCard(state.currentCard - 1);
  } else {
    // not enough swipe distance → stay on current card
    showCard(state.currentCard);
  }
});

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
