(function () {
  // ───────── CONFIG & STATE ─────────
  const DELIVERY_DATA = [
    { CONSIGNMENT: "9999912345678", ETA: "23/06/2025", "RECEIVER NAME": "Northey", POSTCODE: "4221", "RECEIVER PHONE": "0403642769" },
    { CONSIGNMENT: "1111198765432", ETA: "23/06/2025", "RECEIVER NAME": "Catania", POSTCODE: "2142", "RECEIVER PHONE": "0297218106" },
    { CONSIGNMENT: "2222212345678", ETA: "24/06/2025", "RECEIVER NAME": "Cipolla", POSTCODE: "2028", "RECEIVER PHONE": "0492847511" },
    { CONSIGNMENT: "6666698765432", ETA: "24/06/2025", "RECEIVER NAME": "Smith", POSTCODE: "2000", "RECEIVER PHONE": "0404498449" },
  ];

  const CUSTOMER_SERVICE_EMAIL = "customerservice@example.com"; // Change this to actual email

  const STEPS = [
    { id: "topic", text: "Hello! How may I assist you today?", type: "smartChoice", choices: ["Track Consignment", "Pickups"] },
    { id: "role", text: "Are you the Sender or Receiver, please?", type: "choice", choices: ["Sender", "Receiver"], dependsOn: "Track Consignment" },
    { id: "postcode", text: "Please enter the Postcode:", type: "input", dependsOn: "Track Consignment" },
    { id: "consign", text: "Please enter the Consignment Number:", type: "input", dependsOn: "Track Consignment" },
    { id: "securityIntro", text: "Thank you. Consignment found.\nPlease answer the following security questions.", type: "info", dependsOn: "Track Consignment" },
    { id: "phone", text: "Please enter your Phone Number:", type: "input", dependsOn: "Track Consignment" },
    { id: "surname", text: "Please enter your Surname:", type: "input", dependsOn: "Track Consignment" },
  ];

  const STATE = {
    answers: {},
    idx: 0,
    body: null,
    inputPane: null,
    awaitingResponse: false,
    lastQuestionMsg: null,
    buttonsContainer: null,
  };

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

      if (callback) callback(msg);
    }, delay);
  }

  function clearButtonsContainer() {
    if (STATE.buttonsContainer) {
      STATE.buttonsContainer.remove();
      STATE.buttonsContainer = null;
    }
  }

  function showButtonsBelowQuestion(buttons) {
    clearButtonsContainer();
    if (!STATE.lastQuestionMsg) return;
    const container = document.createElement("div");
    container.className = "choice-container";
    buttons.forEach(({text, onClick}) => {
      const btn = document.createElement("button");
      btn.className = "chat-btn";
      btn.textContent = text;
      btn.onclick = onClick;
      container.appendChild(btn);
    });
    STATE.lastQuestionMsg.insertAdjacentElement("afterend", container);
    STATE.buttonsContainer = container;
  }

  function showInputPanel(show = true) {
    if (show) {
      STATE.inputPane.style.display = "flex";
      STATE.inputPane.querySelector("input")?.focus();
    } else {
      STATE.inputPane.style.display = "none";
      STATE.inputPane.innerHTML = "";
    }
  }

  function clearInputPane() {
    STATE.inputPane.innerHTML = "";
  }

  function resetInput() {
    clearInputPane();
    clearButtonsContainer();
    showInputPanel(true);
    STATE.awaitingResponse = false;
  }

  function askTryAgain() {
    resetInput();
    addMessage("Sorry, those details do not match anything in the system.", "bot", 0, (msg) => {
      STATE.lastQuestionMsg = msg;
      addMessage("Would you like to try again?", "bot", 0, (msg2) => {
        STATE.lastQuestionMsg = msg2;
        STATE.awaitingResponse = true;
        showInputPanel(false);
        showButtonsBelowQuestion([
          {
            text: "Yes",
            onClick: () => {
              addMessage("Yes", "user", 0, () => {
                resetInput();
                STATE.answers = {};
                STATE.idx = 0;
                showStep();
              });
            },
          },
          {
            text: "No",
            onClick: () => {
              addMessage("No", "user", 0, () => {
                resetInput();
                addMessage("Thank you for contacting Direct Freight Express. Have a great day.", "bot");
              });
            },
          },
        ]);
      });
    });
  }

  // Send email to customer service (dummy function, replace with your backend)
  function sendUrgentEmail(details) {
    // For demo, we'll just log it. Replace with real email send logic.
    console.log("Sending urgent email with details:", details);

    // Example POST request (you need a backend API endpoint for this)
    /*
    fetch("/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    }).then(() => {
      addMessage("Your request to flag this freight as urgent has been sent to customer service.", "bot");
    }).catch(() => {
      addMessage("Sorry, we couldn't send your urgent request. Please contact customer service directly.", "bot");
    });
    */
    
    addMessage("Your request to flag this freight as urgent has been sent to customer service.", "bot");
  }

  function finalizeFlow() {
    if (STATE.answers.topic !== "Track Consignment") {
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

    resetInput();
    addMessage("Thank you. We have matched your information.", "bot", 0, (msg) => {
      STATE.lastQuestionMsg = msg;
      addMessage("How may I assist you further?", "bot", 0, (msg2) => {
        STATE.lastQuestionMsg = msg2;
        STATE.awaitingResponse = true;

        showInputPanel(true);
        clearButtonsContainer();

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

        function handleUserQuestion() {
          const q = txt.value.trim();
          if (!q) return;

          addMessage(q, "user", 0, () => {
            const qNorm = q.toLowerCase();

            // Match the ETA date as Date object
            const [d, m, y] = match.ETA.split("/").map(Number);
            const etaDate = new Date(y, m - 1, d);
            const today = new Date();

            // Check if user wants delivery time on ETA date in future
            if (/time.*delivery/.test(qNorm)) {
              if (etaDate > today) {
                addMessage(`Please check back after 8:30am on ${match.ETA} for delivery time details.`, "bot");
              } else {
                addMessage("Delivery time details are not available right now. Please contact customer service for more info.", "bot");
              }
            }
            // If user wants to flag freight urgent
            else if (/urgent/.test(qNorm)) {
              // Compose email details object
              const emailDetails = {
                subject: "Urgent Freight Request",
                consignment: match.CONSIGNMENT,
                eta: match.ETA,
                receiverName: match["RECEIVER NAME"],
                postcode: match.POSTCODE,
                phone: match["RECEIVER PHONE"],
                surname: STATE.answers.surname,
                role: STATE.answers.role || "N/A",
                message: q,
              };
              sendUrgentEmail(emailDetails);
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

        STATE.inputPane.append(etaBtn, txt, send);
        txt.focus();
      });
    });
  }

  function showStep() {
    if (STATE.idx >= STEPS.length) return finalizeFlow();

    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      return showStep();
    }

    resetInput();

    addMessage(step.text, "bot", 0, (msg) => {
      STATE.lastQuestionMsg = msg;
      STATE.awaitingResponse = true;

      if (step.type === "smartChoice") {
        showInputPanel(false);

        showButtonsBelowQuestion(
          step.choices.map(ch => ({
            text: ch,
            onClick: () => {
              addMessage(ch, "user", 0, () => {
                STATE.answers[step.id] = ch;
                STATE.idx++;
                STATE.awaitingResponse = false;
                resetInput();
                showStep();
              });
            }
          }))
        );

        showInputPanel(true);
        STATE.inputPane.innerHTML = "";

        const txt = document.createElement("input");
        txt.className = "chat-text";
        txt.placeholder = "Or type…";

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

        STATE.inputPane.appendChild(txt);
        txt.focus();

      } else if (step.type === "choice") {
        showInputPanel(false);
        showButtonsBelowQuestion(
          step.choices.map(ch => ({
            text: ch,
            onClick: () => {
              addMessage(ch, "user", 0, () => {
                STATE.answers[step.id] = ch;
                STATE.idx++;
                STATE.awaitingResponse = false;
                resetInput();
                showStep();
              });
            }
          }))
        );

      } else if (step.type === "input") {
        showInputPanel(true);

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
              if (step.id === "consign") {
                const match = DELIVERY_DATA.find(record =>
                  normalize(record.POSTCODE) === normalize(STATE.answers.postcode) &&
                  normalize(record.CONSIGNMENT) === normalize(value)
                );
                if (!match) {
                  return askTryAgain();
                }
                // Show security intro message then continue
                addMessage("Thank you. Consignment found.\nPlease answer the following security questions.", "bot", 0, () => {
                  STATE.idx++; // skip consign confirmation step
                  STATE.idx++; // next question (phone)
                  STATE.awaitingResponse = false;
                  resetInput();
                  showStep();
                });
                return; // skip usual flow here
              }

              STATE.answers[step.id] = value;
              STATE.idx++;
              STATE.awaitingResponse = false;
              resetInput();
              showStep();
            });

            input.value = "";
          }
        });

        clearInputPane();
        STATE.inputPane.appendChild(input);
        input.focus();
      } else if (step.type === "info") {
        showInputPanel(false);
        STATE.awaitingResponse = false;
        STATE.idx++;
        showStep();
      }
    });
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
          showStep();
        } else {
          addMessage("Alright, please choose again or rephrase.", "bot");
          STATE.idx = 0; // reset to first step
          showStep();
        }
      };
      STATE.inputPane.appendChild(btn);
    });
  }

  // ───────── INIT ─────────
  document.addEventListener("DOMContentLoaded", () => {
    STATE.body = document.getElementById("chat-body");
    STATE.inputPane = document.getElementById("chat-input");

    STATE.inputPane.style.display = "flex";
    STATE.inputPane.style.gap = "8px";
    STATE.inputPane.style.flexShrink = "0";
    STATE.inputPane.style.padding = "12px";

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
