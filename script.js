(function () {
  // ───────── CONFIG & STATE ─────────
  const DELIVERY_DATA = [
    { CONSIGNMENT: "9999912345678", ETA: "23/06/2025", "RECEIVER NAME": "Northey", POSTCODE: "4221", "RECEIVER PHONE": "0403642769" },
    { CONSIGNMENT: "1111198765432", ETA: "23/06/2025", "RECEIVER NAME": "Catania", POSTCODE: "2142", "RECEIVER PHONE": "0297218106" },
    { CONSIGNMENT: "2222212345678", ETA: "24/06/2025", "RECEIVER NAME": "Cipolla", POSTCODE: "2028", "RECEIVER PHONE": "0492847511" },
    { CONSIGNMENT: "6666698765432", ETA: "24/06/2025", "RECEIVER NAME": "Smith", POSTCODE: "2000", "RECEIVER PHONE": "0404498449" },
  ];

  const STEPS = [
    { id: "topic", text: "Hello! How may I assist you today?", type: "smartChoice", choices: ["Track Consignment", "Pickups"] },
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
    consignmentMatch: null, // store matched record after consignment+postcode check
  };

  // ───────── HELPERS ─────────
  const normalize = str => (str || "").toLowerCase().replace(/\s+/g, "").trim();
  const normalizeName = str => (str || "").toLowerCase().replace(/\s+/g, "").trim();
  const normalizePhone = str => (str || "").replace(/\D/g, ""); // digits only
  const scrollToBottom = () => { STATE.body.scrollTop = STATE.body.scrollHeight; };
  const isWeekend = () => [0, 6].includes(new Date().getDay());

  const matchIntent = text => {
    const input = normalize(text);
    if (/track|delivery|where/.test(input)) return "Track Consignment";
    if (/pickup|collect/.test(input)) return "Pickups";
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
      bubble.textContent = text;

      msg.append(avatar, bubble);
      STATE.body.appendChild(msg);
      scrollToBottom();
    }, delay);
  }

  // Reset conversation to start
  function resetConversation() {
    STATE.answers = {};
    STATE.idx = 0;
    STATE.consignmentMatch = null;
    STATE.inputPane.innerHTML = "";
    showStep();
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
          if (intent === "Pickups") {
            // Special handling: feature coming soon
            addMessage("This feature coming soon.", "bot");
            STATE.inputPane.innerHTML = "";
            const startAgainBtn = document.createElement("button");
            startAgainBtn.className = "chat-btn";
            startAgainBtn.textContent = "Start Again";
            startAgainBtn.onclick = () => resetConversation();
            const exitBtn = document.createElement("button");
            exitBtn.className = "chat-btn";
            exitBtn.textContent = "Exit";
            exitBtn.onclick = () => {
              addMessage("Alright, feel free to ask if you need anything else.", "bot");
              STATE.inputPane.innerHTML = "";
            };
            STATE.inputPane.append(startAgainBtn, exitBtn);
          } else {
            STATE.idx++;
            showStep();
          }
        } else {
          addMessage("Alright, please choose again or rephrase.", "bot");
          STATE.idx = 0; // reset to first step to choose topic again
          showStep();
        }
      };
      STATE.inputPane.appendChild(btn);
    });
  }

  // Ask if user wants to try again after failed details match
  function askTryAgain() {
    STATE.inputPane.innerHTML = "";
    addMessage("Sorry, those details do not match anything in the system.", "bot");
    addMessage("Would you like to try again?", "bot");
    ["Yes", "No"].forEach(label => {
      const btn = document.createElement("button");
      btn.className = "chat-btn";
      btn.textContent = label;
      btn.onclick = () => {
        addMessage(label, "user");
        if (label === "Yes") {
          STATE.answers = {};
          STATE.idx = 2; // Restart from postcode input (assuming topic and role selected)
          showStep();
        } else {
          addMessage("Alright, how else can I help you?", "bot");
          STATE.inputPane.innerHTML = "";
        }
      };
      STATE.inputPane.appendChild(btn);
    });
  }

  // When all questions answered and validated
  function finalizeFlow() {
    if (STATE.answers.topic !== "Track Consignment") {
      addMessage("Connecting you to a live customer service representative now.", "bot");
      STATE.inputPane.innerHTML = "";
      return;
    }

    const match = DELIVERY_DATA.find(record =>
      normalize(record.POSTCODE) === normalize(STATE.answers.postcode) &&
      normalize(record.CONSIGNMENT) === normalize(STATE.answers.consign) &&
      normalizePhone(record["RECEIVER PHONE"]) === normalizePhone(STATE.answers.phone) &&
      normalizeName(record["RECEIVER NAME"]) === normalizeName(STATE.answers.surname)
    );

    if (!match) return askTryAgain();

    STATE.consignmentMatch = match;

    addMessage("Thank you. Consignment found.", "bot");
    addMessage("Please answer the following security questions.", "bot");

    // Continue with security questions or options

    STATE.inputPane.innerHTML = "";

    const etaBtn = document.createElement("button");
    etaBtn.className = "chat-btn";
    etaBtn.textContent = "ETA";
    etaBtn.onclick = () => addMessage(`Your ETA is ${match.ETA}.`, "bot");

    const urgentBtn = document.createElement("button");
    urgentBtn.className = "chat-btn";
    urgentBtn.textContent = "Flag Freight as Urgent";
    urgentBtn.onclick = () => {
      addMessage("Request to flag freight as urgent received. Customer service has been notified.", "bot");
      sendUrgentEmail(match, STATE.answers);
    };

    const txt = document.createElement("input");
    txt.className = "chat-text";
    txt.placeholder = "Type your question…";

    const send = document.createElement("button");
    send.className = "chat-btn";
    send.textContent = "Send";

    send.onclick = () => {
      const q = txt.value.trim().toLowerCase();
      if (!q) return;
      addMessage(txt.value.trim(), "user");

      if (q.includes("time") && q.includes("delivery")) {
        if (isFutureDate(match.ETA)) {
          addMessage("Please check back after 8:30am on the ETA date.", "bot");
        } else {
          addMessage("Your delivery time is currently not available.", "bot");
        }
      } else {
        addMessage("Thanks for your question! We'll get back to you shortly.", "bot");
      }
      txt.value = "";
    };

    txt.addEventListener("keypress", e => {
      if (e.key === "Enter") send.click();
    });

    STATE.inputPane.append(etaBtn, urgentBtn, txt, send);
    txt.focus();
  }

  // Helper: Check if ETA date is in the future compared to today
  function isFutureDate(etaStr) {
    const [day, month, year] = etaStr.split("/").map(Number);
    const etaDate = new Date(year, month - 1, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return etaDate > now;
  }

  // Dummy email sender simulation for urgent flag
  function sendUrgentEmail(match, answers) {
    console.log("Sending urgent freight flag email with details:");
    console.log("Consignment:", match.CONSIGNMENT);
    console.log("Receiver:", match["RECEIVER NAME"]);
    console.log("Phone:", match["RECEIVER PHONE"]);
    console.log("Postcode:", match.POSTCODE);
    console.log("User answers:", answers);
    // Integrate your real email sending API or service here
  }

  // ───────── MAIN CHAT FLOW ─────────
  function showStep() {
    if (STATE.idx >= STEPS.length) return finalizeFlow();

    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      return showStep();
    }

    STATE.inputPane.innerHTML = "";

    // Show bot question first
    addMessage(step.text, "bot", 0);

    if (step.type === "smartChoice") {
      const cdiv = document.createElement("div");
      cdiv.className = "choice-container";
      step.choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = ch;
        btn.onclick = () => {
          addMessage(ch, "user");
          // If Pickups selected, short circuit here:
          if (ch === "Pickups") {
            addMessage("This feature coming soon.", "bot");
            STATE.inputPane.innerHTML = "";
            const startAgainBtn = document.createElement("button");
            startAgainBtn.className = "chat-btn";
            startAgainBtn.textContent = "Start Again";
            startAgainBtn.onclick = () => resetConversation();
            const exitBtn = document.createElement("button");
            exitBtn.className = "chat-btn";
            exitBtn.textContent = "Exit";
            exitBtn.onclick = () => {
              addMessage("Alright, feel free to ask if you need anything else.", "bot");
              STATE.inputPane.innerHTML = "";
            };
            STATE.inputPane.append(startAgainBtn, exitBtn);
            return;
          }
          STATE.answers[step.id] = ch;
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
          const intent = matchIntent(u);
          if (intent) {
            confirmIntent(intent);
          } else {
            askTryAgain();
          }
        }
      });

    } else if (step.type === "choice") {
      step.choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = ch;
        btn.onclick = () => {
          addMessage(ch, "user");
          STATE.answers[step.id] = ch;
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

          // Validation with error messages
          let valid = true;
          let errMsg = "";

          if (step.id === "postcode" && !validators.postcode(value)) {
            valid = false;
            errMsg = "Postcode must be 4 digits.";
          } else if (step.id === "phone" && !validators.phone(value)) {
            valid = false;
            errMsg = "Phone must be 10 digits, start 02/03/04/07/08.";
          } else if (step.id === "consign" && !validators.consign(value)) {
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

          // Save answer
          STATE.answers[step.id] = value;
          addMessage(value, "user");

          // Special check after postcode and consignment inputs:
          if (step.id === "consign") {
            // Check if postcode+consign match a record:
            const match = DELIVERY_DATA.find(record =>
              normalize(record.POSTCODE) === normalize(STATE.answers.postcode) &&
              normalize(record.CONSIGNMENT) === normalize(value)
            );
            if (!match) {
              // No match - go to try again
              return askTryAgain();
            }
          }

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

    // CSS handles layout positioning

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
      "Welcome to Direct Freight Express. This chat is monitored for accuracy and reporting purposes.",
      "bot",
      0
    );
    setTimeout(showStep, 1000);
  });
})();
