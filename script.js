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

  // Polite delayed message add
  function addMessage(text, sender = "bot", baseDelay = 800) {
    const delay = baseDelay + 400 + Math.random() * 800;
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
    }, delay);
  }

  // Ask user to confirm detected intent
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
      STATE.inputPane.appendChild(btn);
    });
  }

  // Ask if user wants live agent
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
          // TODO: Insert live chat handoff here
        } else {
          addMessage("Alright, how else can I help you?", "bot");
        }
      };
      STATE.inputPane.appendChild(btn);
    });
  }

  // When all questions answered and validated
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

    txt.addEventListener("keypress", e => {
      if (e.key === "Enter") send.click();
    });

    STATE.inputPane.append(etaBtn, txt, send);
    txt.focus();
  }

  // Main function to show each step
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
      const cdiv = document.createElement("div");
      cdiv.className = "choice-container";
      step.choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = ch;
        btn.onclick = () => {
          STATE.answers[step.id] = ch;
          addMessage(ch, "user");
          STATE.idx++;
          showStep();
        };
        cdiv.appendChild(btn);
      });

      const wrap = document.createElement("div");
      const txt = document.createElement("input");
      txt.className = "chat-text";
      txt.placeholder = "Or type…";
      wrap.appendChild(txt);

      STATE.inputPane.append(cdiv, wrap);

      txt.focus();
      txt.addEventListener("keypress", e => {
        if (e.key === "Enter" && txt.value.trim()) {
          const u = txt.value.trim();
          addMessage(u, "user");
          wrap.remove();
          const intent = matchIntent(u);
          if (intent) confirmIntent(intent);
          else askLiveAgentConsent();
        }
      });

    } else if (step.type === "choice") {
      step.choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = ch;
        btn.onclick = () => {
          STATE.answers[step.id] = ch;
          addMessage(ch, "user");
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
          let valid = true;
          let errMsg = "";

          if (step.id === "postcode" && !validators.postcode(value)) {
            valid = false;
            errMsg = "Postcode must be 4 digits.";
          }
          if (step.id === "phone" && !validators.phone(value)) {
            valid = false;
            errMsg = "Phone must be 10 digits, start 02/03/04/07/08.";
          }
          if (step.id === "consign" && !validators.consign(value)) {
            valid = false;
            errMsg = "Consignment number must be 13 digits.";
          }

          if (!valid) {
            const err = document.createElement("div");
            err.className = "error";
            err.textContent = errMsg;
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

    // Clear any fixed positioning styles on input panel, CSS handles layout
    STATE.inputPane.style.position = "";
    STATE.inputPane.style.bottom = "";
    STATE.inputPane.style.left = "";
    STATE.inputPane.style.width = "";
    STATE.inputPane.style.backgroundColor = "";
    STATE.inputPane.style.padding = "12px";
    STATE.inputPane.style.display = "flex";
    STATE.inputPane.style.gap = "8px";
    STATE.inputPane.style.flexShrink = "0";

    // Resize chat body to fill space between header and input bar
    function resizeBody() {
      const widget = document.getElementById("chat-widget");
      const header = document.getElementById("chat-header");
      const input = document.getElementById("chat-input");

      const totalHeight = widget.clientHeight;
      const headerHeight = header.offsetHeight;
      const inputHeight = input.offsetHeight;
      const bodyHeight = totalHeight - headerHeight - inputHeight;

      STATE.body.style.height = bodyHeight + "px";
      STATE.body.style.overflowY = "auto";
    }

    resizeBody();
    window.addEventListener("resize", resizeBody);

    addMessage(
      "Welcome to Direct Freight Express! This chat is monitored for accuracy & reporting purposes. 🙏",
      "bot",
      0
    );
    setTimeout(showStep, 1000);
  });
})();
