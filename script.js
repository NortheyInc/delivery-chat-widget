(function () {
  const DELIVERY_DATA = [
    { CONSIGNMENT: "9999912345678", ETA: "24/06/2025", "RECEIVER NAME": "Northey", POSTCODE: "4221", "RECEIVER PHONE": "0403642769", TIME_WINDOW: "11:30am and 1:30pm (time taken from COADS)" },
    { CONSIGNMENT: "1111198765432", ETA: "24/06/2025", "RECEIVER NAME": "Catania", POSTCODE: "2142", "RECEIVER PHONE": "0297211111", TIME_WINDOW: "After 2:00pm (time taken from COADS)" },
    { CONSIGNMENT: "2222212345678", ETA: "25/06/2025", "RECEIVER NAME": "Cipolla", POSTCODE: "2028", "RECEIVER PHONE": "0492847511", TIME_WINDOW: "8:00am and 6:00pm" },
    { CONSIGNMENT: "6666698765432", ETA: "26/06/2025", "RECEIVER NAME": "Smith", POSTCODE: "2000", "RECEIVER PHONE": "0404499999", TIME_WINDOW: "10:00am and 3:00pm" },
  ];

  const STATE = {
    answers: {},
    idx: 0,
    body: null,
    inputPane: null,
    consignmentMatch: null,
  };

  const normalize = str => (str || "").toLowerCase().replace(/\s+/g, "").trim();
  const normalizePhone = str => (str || "").replace(/\D/g, "");
  const scrollToBottom = () => { STATE.body.scrollTop = STATE.body.scrollHeight; };

  const isToday = etaStr => {
    const [d, m, y] = etaStr.split("/").map(Number);
    const eta = new Date(y, m - 1, d);
    return eta.toDateString() === new Date().toDateString();
  };

  const matchIntent = text => {
    const input = normalize(text);
    if (/track|delivery|where|when|order|carton|consignment/.test(input)) return "Track Consignment";
    if (/pickup|collect/.test(input)) return "Pickups";
    return null;
  };

  function addMessage(text, sender = "bot", baseDelay = 1200) {
    return new Promise(resolve => {
      const delay = baseDelay + Math.random() * 800;
      setTimeout(() => {
        const msg = document.createElement("div");
        msg.className = `msg ${sender}`;
        const avatar = document.createElement("div");
        avatar.className = `avatar ${sender}`;
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerHTML = text;
        msg.append(avatar, bubble);
        STATE.body.appendChild(msg);
        scrollToBottom();
        resolve();
      }, delay);
    });
  }

  function resetConversation() {
    STATE.answers = {};
    STATE.idx = 0;
    STATE.consignmentMatch = null;
    STATE.inputPane.innerHTML = "";
    showStep();
  }

  async function askTryAgain() {
    STATE.inputPane.innerHTML = "";
    await addMessage(
      `Details entered do not match. Please try again or for Tracking of a consignment, please go to <a href="https://www.directfreight.com.au/ConsignmentStatus.aspx" target="_blank">https://www.directfreight.com.au/ConsignmentStatus.aspx</a>`,
      "bot"
    );
    await addMessage("Would you like to try again?", "bot");
    const container = document.createElement("div");
    container.className = "choice-container";
    ["Yes", "No"].forEach(label => {
      const btn = document.createElement("button");
      btn.className = "chat-btn";
      btn.textContent = label;
      btn.onclick = async () => {
        container.innerHTML = "";
        await addMessage(label, "user");
        if (label === "Yes") {
          STATE.answers = {};
          STATE.idx = 1;
          showStep();
        } else {
          await addMessage("Alright, how else can I help you?", "bot");
          STATE.inputPane.innerHTML = "";
        }
      };
      container.appendChild(btn);
    });
    STATE.inputPane.appendChild(container);
  }

  async function confirmIntent(intent) {
    STATE.inputPane.innerHTML = "";
    await addMessage(`Are you after ${intent}?`, "bot");
    const container = document.createElement("div");
    container.className = "choice-container";
    ["Yes", "No"].forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "chat-btn";
      btn.textContent = opt;
      btn.onclick = async () => {
        container.innerHTML = "";
        await addMessage(opt, "user");
        if (opt === "Yes") {
          STATE.answers.topic = intent;
          STATE.idx++;
          showStep();
        } else {
          await addMessage("Okay, what can I help you with then?", "bot");
          STATE.inputPane.innerHTML = "";
        }
      };
      container.appendChild(btn);
    });
    STATE.inputPane.appendChild(container);
  }

  async function finalizeFlow() {
    await addMessage("Thank you. We have matched your information.", "bot");
    await addMessage("How may I assist you?", "bot");

    STATE.inputPane.innerHTML = "";

    const etaBtn = document.createElement("button");
    etaBtn.className = "chat-btn";
    etaBtn.textContent = "When will it be delivered?";
    etaBtn.onclick = async () => {
      await addMessage(`Your ETA is ${STATE.consignmentMatch.ETA}.`, "bot");
    };

    const input = document.createElement("input");
    input.className = "chat-text";
    input.placeholder = "Type your question…";

    const send = document.createElement("button");
    send.className = "chat-btn";
    send.textContent = "Send";
    send.onclick = async () => {
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      await addMessage(input.value.trim(), "user");
      if (q.includes("when") && q.includes("deliver")) {
        await addMessage(`Your ETA is ${STATE.consignmentMatch.ETA}.`, "bot");
      } else if (q.includes("time")) {
        if (isToday(STATE.consignmentMatch.ETA)) {
          await addMessage(`Delivery time will be between ${STATE.consignmentMatch.TIME_WINDOW}.`, "bot");
        } else {
          await addMessage("Please check back after 8:30am on the ETA date.", "bot");
        }
      } else {
        await addMessage("Thanks for your question! We'll get back to you shortly.", "bot");
      }
      input.value = "";
    };
    input.addEventListener("keypress", e => { if (e.key === "Enter") send.click(); });

    STATE.inputPane.append(etaBtn, input, send);
    input.focus();
  }

  async function showStep() {
    const STEPS = [
      { id: "topic", text: "Hello! How may I assist you today?", type: "smartChoice", choices: ["Track Consignment", "Pickups"] },
      { id: "postcode", text: "Please enter the postcode that the delivery is going to:", type: "input", dependsOn: "Track Consignment" },
      { id: "consign", text: "Please enter the Consignment Number:", type: "input", dependsOn: "Track Consignment" },
      { id: "phone", text: "", type: "input", dependsOn: "Track Consignment" },
      { id: "surname", text: "Please enter your Surname:", type: "input", dependsOn: "Track Consignment" },
    ];
    if (STATE.idx >= STEPS.length) return finalizeFlow();
    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      return showStep();
    }

    STATE.inputPane.innerHTML = "";
    if (step.text) await addMessage(step.text, "bot", 0);

    if (step.type === "smartChoice") {
      const cdiv = document.createElement("div");
      cdiv.className = "choice-container";
      step.choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = ch;
        btn.onclick = async () => {
          Array.from(cdiv.children).forEach(b => b.disabled = true);
          await addMessage(ch, "user");
          STATE.answers.topic = ch;

          // Remove buttons from chat body on click (fix)
          cdiv.remove();

          STATE.idx++;
          showStep();
        };
        cdiv.appendChild(btn);
      });

      // Clear input pane and append buttons to chat body (fix)
      STATE.inputPane.innerHTML = "";
      STATE.body.appendChild(cdiv);

      return;
    }

    const input = document.createElement("input");
    input.className = "chat-text";
    input.placeholder = "Enter here…";
    input.addEventListener("keypress", async e => {
      if (e.key === "Enter" && input.value.trim()) {
        input.disabled = true;
        const val = input.value.trim();

        if (step.id === "postcode" && !/^\d{4}$/.test(val)) {
          const em = document.createElement("div");
          em.className = "error";
          em.textContent = "Postcode must be 4 digits.";
          STATE.inputPane.appendChild(em);
          input.disabled = false;
          return;
        }

        if (step.id === "consign") {
          if (!/^\d{13}$/.test(val)) {
            const em = document.createElement("div");
            em.className = "error";
            em.textContent = "Consignment number must be 13 digits.";
            STATE.inputPane.appendChild(em);
            input.disabled = false;
            return;
          }
          const match = DELIVERY_DATA.find(r =>
            normalize(r.POSTCODE) === normalize(STATE.answers.postcode) &&
            normalize(r.CONSIGNMENT) === normalize(val)
          );
          if (!match) return askTryAgain();
          STATE.consignmentMatch = match;
          await addMessage(val, "user");
          await addMessage("Details have been matched in our system.", "bot");
          await addMessage("For security purposes, please enter your phone number.", "bot");
          STATE.answers.consign = val;
          STATE.idx = 3; // jump to phone step
          STATE.inputPane.innerHTML = "";
          showStep();
          return;
        }

        if (step.id === "phone" && !/^0[23478]\d{8}$/.test(val)) {
          const em = document.createElement("div");
          em.className = "error";
          em.textContent = "Phone must be 10 digits, start 02/03/04/07/08.";
          STATE.inputPane.appendChild(em);
          input.disabled = false;
          return;
        }

        STATE.answers[step.id] = val;
        await addMessage(val, "user");
        STATE.idx++;
        showStep();
      }
    });
    STATE.inputPane.appendChild(input);
    input.focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    STATE.body = document.getElementById("chat-body");
    STATE.inputPane = document.getElementById("chat-input");
    function resizeBody() {
      const widget = document.getElementById("chat-widget");
      const header = document.getElementById("chat-header");
      const input = document.getElementById("chat-input");
      STATE.body.style.height = (widget.clientHeight - header.offsetHeight - input.offsetHeight) + "px";
      STATE.body.style.overflowY = "auto";
    }
    resizeBody();
    window.addEventListener("resize", resizeBody);
    addMessage(
      "Welcome to Direct Freight Express. This chat is monitored for accuracy and reporting purposes.",
      "bot",
      0
    ).then(() => setTimeout(showStep, 800));
  });
})();
