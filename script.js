// Improved Delivery Chatbot UI Script
(function () {
  // ───────── CONFIG & STATE ─────────
  const DELIVERY_DATA = [
    { CONSIGNMENT: "9999912345678", ETA: "23/06/2025", "RECEIVER NAME": "Northey", POSTCODE: "4221", "RECEIVER PHONE": "0403642769" },
    { CONSIGNMENT: "1111198765432", ETA: "23/06/2025", "RECEIVER NAME": "Catania", POSTCODE: "2142", "RECEIVER PHONE": "0297218106" },
    { CONSIGNMENT: "2222212345678", ETA: "24/06/2025", "RECEIVER NAME": "Cipolla", POSTCODE: "2028", "RECEIVER PHONE": "0492847511" },
    { CONSIGNMENT: "6666698765432", ETA: "24/06/2025", "RECEIVER NAME": "Smith", POSTCODE: "2000", "RECEIVER PHONE": "0404498449" },
  ];

  const STEPS = [
    { id: "topic", text: "Hello! How may I assist you today? 😊", type: "smartChoice", choices: ["Track Consignment", "Pickups", "Sales"] },
    { id: "role", text: "Are you the Sender or Receiver, please?", type: "choice", choices: ["Sender", "Receiver"], dependsOn: "Track Consignment" },
    { id: "postcode", text: "Please enter the Postcode:", type: "input", dependsOn: "Track Consignment" },
    { id: "consign", text: "Please enter the Consignment Number:", type: "input", dependsOn: "Track Consignment" },
    { id: "phone", text: "Please enter your Phone Number:", type: "input", dependsOn: "Track Consignment" },
    { id: "surname", text: "Please enter your Surname:", type: "input", dependsOn: "Track Consignment" },
  ];

  const STATE = {
    answers: {},
    idx: 0,
    body: null,
    inputPane: null,
  };

  // ───────── HELPERS ─────────
  const normalize = str => (str || "").toLowerCase().replace(/\s+/g, "").trim();
  const scrollToBottom = () => { STATE.body.scrollTop = STATE.body.scrollHeight; };
  const isWeekend = () => [0, 6].includes(new Date().getDay());

  const matchIntent = text => {
    const input = normalize(text);
    if (/track|delivery|where/.test(input)) return "Track Consignment";
    if (/pickup|collect/.test(input)) return "Pickups";
    if (/quote|price|sales/.test(input)) return "Sales";
    return null;
  };

  const validators = {
    postcode: val => /^\d{4}$/.test(val),
    phone: val => /^0[23478]\d{8}$/.test(val),
    consign: val => /^\d{13}$/.test(val),
  };

  const addMessage = (text, sender = "bot", delay = 800) => {
    const messageDelay = delay + 400 + Math.random() * 800;
    setTimeout(() => {
      const msg = document.createElement("div");
      msg.className = `msg ${sender}`;
      msg.setAttribute("role", "article");
      msg.setAttribute("aria-live", "polite");

      const avatar = document.createElement("div");
      avatar.className = `avatar ${sender}`;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = text.replace(/\n/g, "<br>");

      msg.append(avatar, bubble);
      STATE.body.appendChild(msg);
      scrollToBottom();
    }, messageDelay);
  };

  function confirmIntent(intent) {
    STATE.inputPane.innerHTML = "";
    addMessage(`Please confirm: ${intent}?`, "bot");
    ["Yes", "No"].forEach(option => {
      const btn = document.createElement("button");
      btn.className = "chat-btn";
      btn.textContent = option;
      btn.onclick = () => {
        addMessage(option, "user");
        if (option === "Yes") {
          STATE.answers.topic = intent;
          STATE.idx++;
        } else {
          addMessage("Alright, please choose again or rephrase. 😊", "bot");
        }
        showStep();
      };
      STATE.inputPane.append(btn);
    });
  }

  function askLiveAgentConsent() {
    STATE.inputPane.innerHTML = "";
    addMessage("Would you like to talk to a live customer service representative?", "bot");
    ["Yes", "No"].forEach(label => {
      const btn = document.createElement("button");
      btn.className = "chat-btn";
      btn.textContent = label;
      btn.onclick = () => {
        addMessage(label, "user");
        if (label === "Yes") {
          addMessage("Thank you, connecting you now…", "bot");
          // Here you can trigger live chat integration
        } else {
          addMessage("Alright, how else can I help you?", "bot");
        }
      };
      STATE.inputPane.append(btn);
    });
  }

  function finalizeFlow() {
    if (STATE.answers.topic !== "Track Consignment") {
      return askLiveAgentConsent();
    }

    const match = DELIVERY_DATA.find(record =>
      normalize(record.POSTCODE) === normalize(STATE.answers.postcode) &&
      normalize(record.CONSIGNMENT) === normalize(STATE.answers.consign) &&
      normalize(record["RECEIVER PHONE"]) === normalize(STATE.answers.phone) &&
      normalize(record["RECEIVER NAME"]) === normalize(STATE.answers.surname)
    );

    if (!match) return askLiveAgentConsent();

    addMessage("Thank you. We have matched your information.", "bot");
    addMessage("How may I assist you further?", "bot");

    STATE.inputPane.innerHTML = "";
    const etaBtn = document.createElement("button");
    etaBtn.className = "chat-btn";
    etaBtn.textContent = "ETA";
    etaBtn.onclick = () => addMessage(`Your ETA is ${match.ETA}.`, "bot");

    const txt = document.createElement("input");
    txt.className = "chat-text";
    txt.placeholder = "Type your question…";
    const send = document.createElement("button");
    send.className = "chat-btn";
    send.textContent = "Send";
    send.onclick = () => {
      const q = txt.value.trim();
      if (!q) return;
      addMessage(q, "user");
      addMessage("Thanks for your question! We'll get back to you shortly.", "bot");
      txt.value = "";
    };
    txt.addEventListener("keypress", e => { if (e.key === "Enter") send.click(); });

    STATE.inputPane.append(etaBtn, txt, send);
    txt.focus();
  }

  function showStep() {
    if (STATE.idx >= STEPS.length) return finalizeFlow();
    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      return showStep();
    }

    addMessage(step.text, "bot");
    STATE.inputPane.innerHTML = "";

    if (step.type === "smartChoice") {
      const container = document.createElement("div");
      container.className = "choice-container";

      step.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = choice;
        btn.onclick = () => {
          STATE.answers[step.id] = choice;
          addMessage(choice, "user");
          STATE.idx++;
          showStep();
        };
        container.appendChild(btn);
      });

      const input = document.createElement("input");
      input.className = "chat-text";
      input.placeholder = "Or type…";
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim()) {
          const userText = input.value.trim();
          addMessage(userText, "user");
          const detected = matchIntent(userText);
          if (detected) confirmIntent(detected);
          else askLiveAgentConsent();
        }
      });

      STATE.body.append(container, input);
      input.focus();

    } else if (step.type === "choice") {
      step.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = choice;
        btn.onclick = () => {
          STATE.answers[step.id] = choice;
          addMessage(choice, "user");
          STATE.idx++;
          showStep();
        };
        STATE.inputPane.appendChild(btn);
      });

    } else if (step.type === "input") {
      const input = document.createElement("input");
      input.className = "chat-text";
      input.placeholder = "Enter here…";
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim()) {
          const value = input.value.trim();
          const validator = validators[step.id];
          if (validator && !validator(value)) {
            const err = document.createElement("div");
            err.className = "error";
            err.textContent = `Invalid ${step.id}.`;
            STATE.inputPane.appendChild(err);
            return;
          }
          STATE.answers[step.id] = value;
          addMessage(value, "user");
          STATE.idx++;
          showStep();
        }
      });
      STATE.inputPane.appendChild(input);
      input.focus();
    }
  }

  // ───────── INIT ─────────
  document.addEventListener("DOMContentLoaded", () => {
    STATE.body = document.getElementById("chat-body");
    STATE.inputPane = document.getElementById("chat-input");

    STATE.inputPane.style.position = "fixed";
    STATE.inputPane.style.bottom = "0";
    STATE.inputPane.style.left = "0";
    STATE.inputPane.style.width = "100%";
    STATE.inputPane.style.backgroundColor = "#fff";
    STATE.body.style.paddingBottom = STATE.inputPane.offsetHeight + "px";

    addMessage("Welcome to Direct Freight Express! This chat is monitored for accuracy & reporting purposes. 🙏", "bot", 0);
    setTimeout(showStep, 1000);
  });
})();
