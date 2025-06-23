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
    awaitingResponse: false,
  };

  // ───────── HELPERS ─────────
  const normalize = str => (str || "").toLowerCase().replace(/\s+/g, "").trim();
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

  // Add message with delay, then callback to continue flow
  function addMessage(text, sender = "bot", baseDelay = 800, callback = null) {
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

      if (callback) callback();
    }, delay);
  }

  // Clear input pane and remove awaiting flag
  function resetInputPane() {
    STATE.inputPane.innerHTML = "";
    STATE.awaitingResponse = false;
  }

  // Ask user to confirm detected intent
  function confirmIntent(intent) {
    resetInputPane();
    addMessage(`Please confirm: ${intent}?`, "bot", 0, () => {
      STATE.awaitingResponse = true;
      ["Yes", "No"].forEach(option => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.textContent = option;
        btn.onclick = () => {
          addMessage(option, "user", 0, () => {
            resetInputPane();
            if (option === "Yes") {
              STATE.answers.topic = intent;
              STATE.idx++;
              showStep();
            } else {
              addMessage("Alright, please choose again or rephrase.", "bot", 0, () => {
                STATE.idx = 0; // reset to first step
                showStep();
              });
            }
          });
        };
        STATE.inputPane.appendChild(btn);
      });
    });
  }

  // New function for retry after no match
  function askTryAgain() {
    resetInputPane();
    addMessage("Sorry, those details do not match anything in the system.", "bot", 0, () => {
      addMessage("Would you like to try again?", "bot", 0, () => {
        STATE.awaitingResponse = true;
        ["Yes", "No"].forEach(option => {
          const btn = document.createElement("button");
          btn.className = "chat-btn";
          btn.textContent = option;
          btn.onclick = () => {
            addMessage(option, "user", 0, () => {
              resetInputPane();
              if (option === "Yes") {
                STATE.answers = {};
                STATE.idx = 0;
                showStep();
              } else {
                addMessage("Thank you for contacting Direct Freight Express. Have a great day.", "bot");
              }
            });
          };
          STATE.inputPane.appendChild(btn);
        });
      });
    });
  }

  // Final flow after all info collected
  function finalizeFlow() {
    if (STATE.answers.topic !== "Track Consignment") {
      // For non-track topics, just end politely
      addMessage("Please contact our customer service for assistance.", "bot");
      return;
    }

    const match = DELIVERY_DATA.find(record =>
      normalize(record.POSTCODE) === normalize(STATE.answers.postcode) &&
      normalize(record.CONSIGNMENT) === normalize(STATE.answers.consign) &&
      normalize(record["RECEIVER PHONE"]) === normalize(STATE.answers.phone) &&
      normalize(record["RECEIVER NAME"]) === normalize(STATE.answers.surname)
    );

    if (!match) return askTryAgain();

    resetInputPane();
    addMessage("Thank you. We have matched your information.", "bot", 0, () => {
      addMessage("How may I assist you further?", "bot", 0, () => {
        // Show ETA button + question input
        STATE.awaitingResponse = true;

        const etaBtn = document.createElement("button");
        etaBtn.className = "chat-btn";
        etaBtn.textContent = "ETA";
        etaBtn.onclick = () => {
          addMessage(`Your ETA is ${match.ETA}.`, "bot");
        };

        const txt = document.createElement("input");
        txt.className = "chat-text";
        txt.placeholder = "Type your question…";

        const send = document.createElement("button");
        send.className = "chat-btn";
        send.textContent = "Send";

        function handleUserQuestion() {
          const q = txt.value.trim();
          if (!q) return;

          addMessage(q, "user", 0, () => {
            const qNorm = q.toLowerCase();

            // Check if user asks for "time of delivery"
            if (/time.*delivery/.test(qNorm)) {
              // Check if ETA is in the future
              const today = new Date();
              const [d, m, y] = match.ETA.split("/").map(Number);
              const etaDate = new Date(y, m - 1, d);

              if (etaDate > today) {
                addMessage(`Please check back after 8:30am on ${match.ETA} for delivery time details.`, "bot");
              } else {
                addMessage("Delivery time details are not available right now. Please contact customer service for more info.", "bot");
              }
            }
            else if (/eta/.test(qNorm)) {
              addMessage(`Your ETA is ${match.ETA}.`, "bot");
            }
            else {
              addMessage("Thanks for your question! We'll get back to you shortly.", "bot");
            }

            txt.value = "";
          });
        }

        send.onclick = handleUserQuestion;
        txt.addEventListener("keypress", e => {
          if (e.key === "Enter") {
            handleUserQuestion();
          }
        });

        resetInputPane();
        STATE.inputPane.append(etaBtn, txt, send);
        txt.focus();
      });
    });
  }

  // Render current step's question and input controls
  function showStep() {
    if (STATE.idx >= STEPS.length) return finalizeFlow();

    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      return showStep();
    }

    resetInputPane();
    STATE.awaitingResponse = true;

    addMessage(step.text, "bot", 0, () => {
      if (step.type === "smartChoice") {
        const cdiv = document.createElement("div");
        cdiv.className = "choice-container";
        step.choices.forEach(ch => {
          const btn = document.createElement("button");
          btn.className = "chat-btn";
          btn.textContent = ch;
          btn.onclick = () => {
            addMessage(ch, "user", 0, () => {
              STATE.answers[step.id] = ch;
              STATE.idx++;
              STATE.awaitingResponse = false;
              showStep();
            });
          };
          cdiv.appendChild(btn);
        });

        const wrap = document.createElement("div");
        const txt = document.createElement("input");
        txt.className = "chat-text";
        txt.placeholder = "Or type…";
        wrap.appendChild(txt);

        txt.addEventListener("keypress", e => {
          if (e.key === "Enter" && txt.value.trim()) {
            addMessage(txt.value.trim(), "user", 0, () => {
              const intent = matchIntent(txt.value.trim());
              if (intent) {
                confirmIntent(intent);
              } else {
                askTryAgain();
              }
              STATE.awaitingResponse = false;
            });
            txt.value = "";
          }
        });

        STATE.inputPane.append(cdiv, wrap);
        txt.focus();

      } else if (step.type === "choice") {
        step.choices.forEach(ch => {
          const btn = document.createElement("button");
          btn.className = "chat-btn";
          btn.textContent = ch;
          btn.onclick = () => {
            addMessage(ch, "user", 0, () => {
              STATE.answers[step.id] = ch;
              STATE.idx++;
              STATE.awaitingResponse = false;
              showStep();
            });
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

            addMessage(value, "user", 0, () => {
              STATE.answers[step.id] = value;

              // Special check after postcode and consignment inputs:
              if (step.id === "consign") {
                // Check if postcode+consign match a record:
                const match = DELIVERY_DATA.find(record =>
                  normalize(record.POSTCODE) === normalize(STATE.answers.postcode) &&
                  normalize(record.CONSIGNMENT) === normalize(value)
                );
                if (!match) {
                  return askTryAgain();
                }
                // If match found, continue normal flow (phone then surname)
              }

              STATE.idx++;
              STATE.awaitingResponse = false;
              showStep();
            });
            input.value = "";
          }
        });

        STATE.inputPane.appendChild(input);
        input.focus();
      }
    });
  }

  // ───────── INIT ─────────
  document.addEventListener("DOMContentLoaded", () => {
    STATE.body = document.getElementById("chat-body");
    STATE.inputPane = document.getElementById("chat-input");

    // Reset styles handled by CSS, just set flex container to stack properly
    STATE.inputPane.style.display = "flex";
    STATE.inputPane.style.gap = "8px";
    STATE.inputPane.style.flexShrink = "0";
    STATE.inputPane.style.padding = "12px";

    // Calculate height of chat body to fill space between header and input bar
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
      "Welcome to Direct Freight Express. This chat is monitored for accuracy & reporting purposes.",
      "bot",
      0,
      () => {
        showStep();
      }
    );
  });
})();
