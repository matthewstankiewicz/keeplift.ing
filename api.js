// ------------------------
// api.js
// ------------------------

// Send log data to Google Apps Script
async function sendLog(data) {
  try {
    const res = await fetch(getScriptURL(), {
      method: "POST",
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn("Failed to send log, queuing:", err);
    queueLog(data);
    throw err;
  }
}

// Queue log data locally
function queueLog(data) {
  const q = JSON.parse(localStorage.getItem("queue") || "[]");
  q.push(data);
  localStorage.setItem("queue", JSON.stringify(q));
}

// Flush queued logs when back online
async function flushQueue() {
  const q = JSON.parse(localStorage.getItem("queue") || "[]");
  if (!q.length) return;

  for (const item of q) {
    try {
      await sendLog(item);
    } catch {
      console.warn("Failed to flush log, will retry later");
    }
  }

  localStorage.removeItem("queue");
}

// Retry queued logs when coming online
window.addEventListener("online", flushQueue);
