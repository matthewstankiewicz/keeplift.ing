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

async function loadData() {
  try {
    const url = getScriptURL();
    console.log("Fetching:", url);

    const res = await fetch(url);
    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("DATA:", data);

    document.getElementById("title").innerText = data.day;
    state.exercises = data.next;

    render();
  } catch (err) {
    console.error("LOAD ERROR:", err);
    document.getElementById("title").innerText = "Error loading data";
  }
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  state.exercises.forEach((ex, i) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="inner">
        <h3>${ex.name}</h3>
        <canvas id="c-${i}"></canvas>
        <div>Suggested: ${ex.weight}</div>
        <input id="w-${i}" value="${ex.weight}">
        <input id="r-${i}" value="${ex.reps}">
        <button onclick="logSet(${i})">Log</button>
      </div>
    `;

    app.appendChild(card);
    buildChart(i, ex.history);
  });
}

function buildChart(i, history) {
  new Chart(document.getElementById(`c-${i}`), {
    type: "line",
    data: {
      labels: history.map(h => h.d),
      datasets: [{ data: history.map(h => h.v) }]
    }
  });
}

async function logSet(i) {
  const ex = state.exercises[i];

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

// INSTALL PROMPT
let deferredPrompt;

window.addEventListener("DOMContentLoaded", () => {
  loadData();
  flushQueue();
});
