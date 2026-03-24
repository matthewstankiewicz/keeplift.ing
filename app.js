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
// Load Data
// ------------------------
async function loadData() {
  try {
    const url = getScriptURL();
    console.log("Fetching:", url);

    const res = await fetch(url);
    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("DATA:", data);

    document.getElementById("title").innerText = data.day || "Workout";

    let exercises = Array.isArray(data.next) ? data.next : [];
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

  state.currentCard = 0;
  showCard(0);
  renderPagination();

  initDrag(); // swipe/drag
}

// ------------------------
// Build Charts
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
// Pagination Dots
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

// ------------------------
// Show Card (peek carousel)
function showCard(index) {
  state.currentCard = index;
  const app = document.getElementById("app");

  // Each card width + margin ≈ 80vw + 2vw gap = 82vw
  const cardWidth = window.innerWidth * 0.82;
  const translateX = -index * cardWidth;

  app.style.transform = `translateX(${translateX}px)`;

  document.querySelectorAll(".dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

// ------------------------
// Drag / Swipe
// ------------------------
function initDrag() {
  const carousel = document.getElementById("app");
  if (!carousel) return;

  let startX = 0, currentTranslate = 0, isDragging = false;

  // TOUCH
  carousel.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    isDragging = true;
    carousel.style.transition = "none";
  });

  carousel.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    currentTranslate = -state.currentCard * window.innerWidth + -diff;
    carousel.style.transform = `translateX(${currentTranslate}px)`;
  });

  carousel.addEventListener("touchend", e => {
    isDragging = false;
    const diff = e.changedTouches[0].clientX - startX;
    carousel.style.transition = "transform 0.4s ease-in-out";
    if (diff < -50 && state.currentCard < state.exercises.length - 1) showCard(state.currentCard + 1);
    else if (diff > 50 && state.currentCard > 0) showCard(state.currentCard - 1);
    else showCard(state.currentCard);
  });

  // MOUSE (desktop)
  carousel.addEventListener("mousedown", e => {
    startX = e.clientX;
    isDragging = true;
    carousel.style.transition = "none";
  });

  carousel.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    currentTranslate = -state.currentCard * window.innerWidth + -diff;
    carousel.style.transform = `translateX(${currentTranslate}px)`;
  });

  carousel.addEventListener("mouseup", e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.clientX - startX;
    carousel.style.transition = "transform 0.4s ease-in-out";
    if (diff < -50 && state.currentCard < state.exercises.length - 1) showCard(state.currentCard + 1);
    else if (diff > 50 && state.currentCard > 0) showCard(state.currentCard - 1);
    else showCard(state.currentCard);
  });

  carousel.addEventListener("mouseleave", () => {
    if (isDragging) showCard(state.currentCard);
  });
}

// ------------------------
// Auto-refresh at midnight
// ------------------------
function scheduleDailyRefresh() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msUntilMidnight = nextMidnight - now;

  setTimeout(() => {
    loadData();
    scheduleDailyRefresh();
  }, msUntilMidnight);
}

// ------------------------
// PWA & DOMContentLoaded
// ------------------------
let deferredPrompt;
window.addEventListener("DOMContentLoaded", () => {
  loadData();
  flushQueue();
  scheduleDailyRefresh();
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
