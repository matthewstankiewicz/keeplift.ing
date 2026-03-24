function getScriptURL() {
  const userKey = localStorage.getItem("workout_key");
  return `https://script.google.com/macros/s/AKfycbxAP0EAtNUCVj97wxyUZJqQf1XHlv9XFFbbit1HBLIWY-8t0c1DZWqS-PXBDuSGB5jX5Q/exec?key=${userKey}`;
}

async function sendLog(data) {
  return fetch(getScriptURL(), {
    method: "POST",
    body: JSON.stringify(data)
  });
}

function queueLog(data) {
  const q = JSON.parse(localStorage.getItem("queue") || "[]");
  q.push(data);
  localStorage.setItem("queue", JSON.stringify(q));
}

async function flushQueue() {
  const q = JSON.parse(localStorage.getItem("queue") || "[]");
  if (!q.length) return;

  for (const item of q) {
    await sendLog(item);
  }

  localStorage.removeItem("queue");
}

window.addEventListener("online", flushQueue);
