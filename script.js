(function () {
  const DELIVERY_DATA = [
    { CONSIGNMENT: "9999912345678", ETA: "24/06/2025", "RECEIVER NAME": "Northey", POSTCODE: "4211", "RECEIVER PHONE": "0403642769", TIME_WINDOW: "Between 3:00pm and 5:00pm <time taken from COADS>" },
    { CONSIGNMENT: "1111198765432", ETA: "24/06/2025", "RECEIVER NAME": "Catania", POSTCODE: "2142", "RECEIVER PHONE": "0297211111", TIME_WINDOW: "After 3:00pm <time taken from COADS>" },
    { CONSIGNMENT: "2222212345678", ETA: "25/06/2025", "RECEIVER NAME": "Cipolla", POSTCODE: "2028", "RECEIVER PHONE": "0492847511", TIME_WINDOW: "Between 10:00am and 12:00pm" },
    { CONSIGNMENT: "6666698765432", ETA: "26/06/2025", "RECEIVER NAME": "Smith", POSTCODE: "2000", "RECEIVER PHONE": "0404499999", TIME_WINDOW: "Between 1:00pm and 3:00pm" },
  ];

  const STATE = {
    answers: {},
    idx: 0,
    body: null,
    inputPane: null,
    consignmentMatch: null,
    stepStarted: false,
  };

  const normalize = str => (str || "").toLowerCase().replace(/\s+/g, "").trim();
  const scrollToBottom = () => { STATE.body.scrollTop = STATE.body.scrollHeight; };

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const isToday = etaStr => {
    const [d, m, y] = etaStr.split("/").map(Number);
    const eta = new Date(y, m - 1, d);
    const today = new Date();
    return eta.toDateString() === today.toDateString();
  };

async function sendEmailNotification(subject, body) {
  try {
    await fetch("https://your-backend-api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: "peterno@directfreight.com.au",
        subject,
        message: body
      })
    });
    console.log("Email sent.");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}


  function addMessage(text, sender = "bot", baseDelay = 1200, typeSlow = false) {
    return new Promise(resolve => {
      const delayTime = baseDelay + Math.random() * 800;
      setTimeout(() => {
        const msg = document.createElement("div");
        msg.className = `msg ${sender}`;
        const avatar = document.createElement("div");
        avatar.className = `avatar ${sender}`;
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        msg.append(avatar, bubble);
        STATE.body.appendChild(msg);
        scrollToBottom();

        if (typeSlow && sender === "bot") {
          let i = 0;
          const interval = setInterval(() => {
            bubble.innerHTML += text[i++];
            scrollToBottom();
            if (i >= text.length) {
              clearInterval(interval);
              resolve();
            }
          }, 30);
        } else {
          bubble.innerHTML = text;
          resolve();
        }
      }, delayTime);
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
    await addMessage(`I'm sorry, but the details you entered do not match our records. Please try again or for tracking a consignment, please visit <a href="https://www.directfreight.com.au/ConsignmentStatus.aspx" target="_blank" rel="noopener">Direct Freight Consignment Status</a>. Thank you for your understanding.`, "bot");
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
          STATE.idx = 1; // go to postcode step
          showStep();
        } else {
          await addMessage("Alright, how else may I assist you today?", "bot");
          STATE.inputPane.innerHTML = "";
        }
      };
      container.appendChild(btn);
    });
    STATE.inputPane.appendChild(container);
  }

async function finalizeFlow() {
  await addMessage("Thank you. We have matched your information.", "bot");
  await addMessage(`Your delivery is scheduled for ${STATE.consignmentMatch.ETA}.`, "bot");
  await addMessage("Is there anything else I can assist you with?", "bot");

  STATE.inputPane.innerHTML = "";
  const input = document.createElement("input");
  input.className = "chat-text";
  input.placeholder = "Type your question…";
  const send = document.createElement("button");
  send.className = "chat-btn";
  send.textContent = "Send";

  send.onclick = async () => {
    const qRaw = input.value.trim();
    const q = normalize(qRaw);
    if (!q) return;
    await addMessage(qRaw, "user");

    // Enhanced AI matching for requests to speak with real person
    const realPersonPhrases = [
      "realperson", "livechat", "speakwithsomeone", "talktooperator",
      "humanagent", "customerrepresentative", "realagent", "agentplease",
      "speaktohuman", "contacthuman", "liveagent"
    ];
    const wantsLiveChat = realPersonPhrases.some(phrase => q.includes(phrase));

    if (wantsLiveChat) {
      const details = STATE.consignmentMatch ? 
        `Consignment: ${STATE.consignmentMatch.CONSIGNMENT}\n` +
        `ETA: ${STATE.consignmentMatch.ETA}\n` +
        `Receiver Name: ${STATE.consignmentMatch["RECEIVER NAME"]}\n` +
        `Postcode: ${STATE.consignmentMatch.POSTCODE}\n` +
        `Phone: ${STATE.consignmentMatch["RECEIVER PHONE"]}\n` +
        `Time Window: ${STATE.consignmentMatch.TIME_WINDOW}`
        : "No consignment matched.";

      await addMessage("No problem. Please click the button below to be connected.", "bot");
      await sendEmailNotification("Live Chat Request", `User requested a live chat. Details:\n${details}`);

      const connectBtn = document.createElement("button");
      connectBtn.className = "chat-btn";
      connectBtn.textContent = "Connect me to a team member";
      STATE.inputPane.innerHTML = "";
      STATE.inputPane.appendChild(connectBtn);

      connectBtn.onclick = async () => {
        await addMessage("Connect me to a team member", "user");
        await addMessage("A team member will join the chat shortly.", "bot");
        STATE.inputPane.innerHTML = "";
      };

      return;
    }

    // Check if user says "Yes" (or similar) to "anything else I can assist you with?"
    const positiveReplies = ["yes", "surecan", "yesplease", "yeah", "yep", "yup"];
    const isPositive = positiveReplies.some(p => q.includes(p));

    if (isPositive) {
      await addMessage("How can I help?", "bot");
      input.value = "";
      input.focus();
      return; // keep chat open for new question
    }

    if (["that'sall", "thatsall", "no", "thanks"].includes(q)) {
      await addMessage("Thank you for contacting Direct Freight Express. Have a great day!", "bot");
      resetConversation();
      return;
    }

    if (q.includes("when") && q.includes("deliver")) {
      await addMessage(`Your estimated delivery date is ${STATE.consignmentMatch.ETA}.`, "bot");
    } else if (q.includes("time")) {
      if (isToday(STATE.consignmentMatch.ETA)) {
        await addMessage(`The delivery time window is ${STATE.consignmentMatch.TIME_WINDOW}.`, "bot");
      } else {
        await addMessage("Please check back after 8:30am on the ETA date for more accurate delivery times. Thank you.", "bot");
      }
    } else {
      await addMessage("Thank you for your question. A customer service representative will get back to you shortly.", "bot");
    }

    input.value = "";
  };

  input.addEventListener("keypress", e => { if (e.key === "Enter") send.click(); });
  STATE.inputPane.append(input, send);
  input.focus();
}

  async function showStep() {
    if (STATE.stepStarted) return; // prevent double starts
    STATE.stepStarted = true;

    const STEPS = [
      {
        id: "topic",
        text: "How may I assist you today?",
        type: "choiceAndInput",
        choices: ["Track Consignment", "Pickups"],
      },
      { id: "postcode", text: "Please enter the postcode that the delivery is going to:", type: "input", dependsOn: "Track Consignment" },
      { id: "consign", text: "Please enter the Consignment Number:", type: "input", dependsOn: "Track Consignment" },
      { id: "phone", text: "For security purposes, please enter your phone number.", type: "input", dependsOn: "Track Consignment" },
      { id: "surname", text: "Please enter your Surname:", type: "input", dependsOn: "Track Consignment" },
    ];

    if (STATE.idx >= STEPS.length) {
      STATE.stepStarted = false;
      return finalizeFlow();
    }

    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      STATE.stepStarted = false;
      return showStep();
    }

    STATE.inputPane.innerHTML = "";
    if (step.text) await addMessage(step.text, "bot", 800);

    if (step.type === "choiceAndInput") {
      // Show buttons and a text input simultaneously

      const container = document.createElement("div");
      container.className = "choice-container";

      step.choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = ch;
        btn.onclick = async () => {
          // Disable buttons to avoid double clicks
          Array.from(container.children).forEach(b => b.disabled = true);
          await addMessage(ch, "user");

          if (ch === "Pickups") {
            await addMessage("Feature coming soon.", "bot");
            STATE.inputPane.innerHTML = "";
            STATE.idx = 0; // reset to start
            STATE.stepStarted = false;
            return showStep();
          }

          if (ch === "Track Consignment") {
            STATE.answers.topic = ch;
            STATE.idx++;
            STATE.inputPane.innerHTML = "";
            STATE.stepStarted = false;
            return showStep();
          }
        };
        container.appendChild(btn);
      });

      // Add free text input below buttons
      const input = document.createElement("input");
      input.className = "chat-text";
      input.placeholder = "Or type your question here…";

      input.addEventListener("keypress", async e => {
        if (e.key === "Enter" && input.value.trim()) {
          const val = input.value.trim();
          input.disabled = true;
          await addMessage(val, "user");
          await addMessage("Sorry, I do not understand. Please try again.", "bot");
          STATE.inputPane.innerHTML = "";
          STATE.idx = 0;
          STATE.stepStarted = false;
          resetConversation();
        }
      });

      STATE.inputPane.append(container, input);
      input.focus();
      STATE.stepStarted = false;
      return;
    }

    // Normal input steps
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
          em.textContent = "Postcode must be 4 digits. Please try again.";
          STATE.inputPane.appendChild(em);
          input.disabled = false;
          STATE.stepStarted = false;
          return;
        }

        if (step.id === "consign") {
          if (!/^\d{13}$/.test(val)) {
            const em = document.createElement("div");
            em.className = "error";
            em.textContent = "Consignment number must be 13 digits. Please try again.";
            STATE.inputPane.appendChild(em);
            input.disabled = false;
            STATE.stepStarted = false;
            return;
          }
          const match = DELIVERY_DATA.find(r =>
            normalize(r.POSTCODE) === normalize(STATE.answers.postcode) &&
            normalize(r.CONSIGNMENT) === normalize(val)
          );
          if (!match) {
            STATE.stepStarted = false;
            return askTryAgain();
          }
          STATE.consignmentMatch = match;
          await addMessage(val, "user");
          await addMessage("Thank you. Your details have been matched in our system.", "bot");
          STATE.answers.consign = val;
          STATE.idx = 3; // jump to phone step
          STATE.inputPane.innerHTML = "";
          STATE.stepStarted = false;
          return showStep();
        }

        if (step.id === "phone" && !/^0[23478]\d{8}$/.test(val)) {
          const em = document.createElement("div");
          em.className = "error";
          em.textContent = "Phone must be 10 digits, starting with 02, 03, 04, 07, or 08. Please try again.";
          STATE.inputPane.appendChild(em);
          input.disabled = false;
          STATE.stepStarted = false;
          return;
        }

        STATE.answers[step.id] = val;
        await addMessage(val, "user");
        STATE.idx++;
        STATE.stepStarted = false;
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
      "Welcome to Direct Freight Express! This chat is monitored for accuracy and reporting purposes.",
      "bot",
      0,
      true
    )
      .then(() => delay(1000))
      .then(() => showStep());
  });
})();
