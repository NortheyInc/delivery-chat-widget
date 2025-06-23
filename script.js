document.addEventListener('DOMContentLoaded', function () {
  const deliveryData = [
    {
      "CONSIGNMENT": "9999912345678",
      "ETA": "23/06/2025",
      "RECEIVER NAME": "Peter Northey",
      "ADDRESS 1": "2 City Link Drive",
      "ADDRESS 2": "",
      "SUBURB": "Cararra",
      "POSTCODE": "4221",
      "RECEIVER PHONE": "0403642769"
    },
    {
      "CONSIGNMENT": "1111198765432",
      "ETA": "23/06/2025",
      "RECEIVER NAME": "Stephen Catania",
      "ADDRESS 1": "Rosehill Gardens",
      "ADDRESS 2": "James Ruse Drive",
      "SUBURB": "Rosehill",
      "POSTCODE": "2142",
      "RECEIVER PHONE": "0297218106"
    },
    {
      "CONSIGNMENT": "2222212345678",
      "ETA": "24/06/2025",
      "RECEIVER NAME": "Peter Cipolla",
      "ADDRESS 1": "Kings Mansion",
      "ADDRESS 2": "",
      "SUBURB": "Double Bay",
      "POSTCODE": "2028",
      "RECEIVER PHONE": "0492847511"
    },
    {
      "CONSIGNMENT": "6666698765432",
      "ETA": "24/06/2025",
      "RECEIVER NAME": "Austin Smith",
      "ADDRESS 1": "42 Wallaby Way",
      "ADDRESS 2": "",
      "SUBURB": "Sydney",
      "POSTCODE": "2000",
      "RECEIVER PHONE": "0404498449"
    }
  ];

  const steps = [
    {
      id: 'topic',
      text: 'How can we assist you today?\nPlease click on one of the buttons below, or write a brief sentence.',
      type: 'smartChoice',
      choices: ['Track Consignment', 'Pickups', 'Sales']
    },
    { id: 'role', text: 'Are you the Sender or Receiver?', type: 'choice', choices: ['Sender', 'Receiver'], dependsOn: 'Track Consignment' },
    { id: 'postcode', text: 'Enter the Postcode:', type: 'input', dependsOn: 'Track Consignment' },
    { id: 'consign', text: 'Enter the Consignment Number:', type: 'input', dependsOn: 'Track Consignment' },
    { id: 'phone', text: 'Enter your Phone Number:', type: 'input', dependsOn: 'Track Consignment' },
    { id: 'surname', text: 'Enter your Surname:', type: 'input', dependsOn: 'Track Consignment' }
  ];

  const answers = {};
  let stepIndex = 0;
  const body = document.getElementById('chat-body');
  const input = document.getElementById('chat-input');

  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = 'msg ' + who;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '');
  }

  function matchIntent(userInput) {
    const text = normalize(userInput);
    if (text.includes('track') || text.includes('where') || text.includes('delivery')) return 'Track Consignment';
    if (text.includes('pickup') || text.includes('collect') || text.includes('pick up')) return 'Pickups';
    if (text.includes('quote') || text.includes('price') || text.includes('sales')) return 'Sales';
    return null;
  }

  function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  function startLiveChat() {
    if (isWeekend()) {
      addMessage("Thanks! Live chat is unavailable on weekends. A team member will reach out soon.", "bot");
      return;
    }

    addMessage("Connecting you with a team member…", "bot");
    sendEmailNotification(answers);

    if (window.Tawk_API && typeof Tawk_API.maximize === "function") {
      Tawk_API.maximize();
    } else {
      addMessage("Live chat widget is loading… please hold.", "bot");
    }
  }

  function sendEmailNotification(data) {
    const body = `
A customer has been escalated from the DFE Chat Bot.

Their responses:

- Topic: ${data.topic}
- Postcode: ${data.postcode}
- Consignment: ${data.consign}
- Phone: ${data.phone}
- Surname: ${data.surname}
- Role: ${data.role}

👉 Click here to reply with wait time: https://northeyinc.github.io/live-chat/
    `.trim();

    fetch('https://formsubmit.co/ajax/YOUR_EMAIL@example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        subject: "Live Chat Escalation",
        message: body
      })
    });
  }

  function fallbackOption() {
    addMessage("Sorry, I didn’t quite catch that. Would you like to speak to someone instead?", 'bot');
    const btn = document.createElement('button');
    btn.className = 'chat-btn';
    btn.textContent = 'Talk to Us';
    btn.onclick = startLiveChat;
    input.appendChild(btn);
  }

  function showStep() {
    input.innerHTML = '';

    if (stepIndex >= steps.length) {
      if (answers.topic !== 'Track Consignment') {
        addMessage("Thanks for letting us know. We’ll pass this to a team member.", "bot");
        startLiveChat();
        return;
      }

      const match = deliveryData.find(row =>
        normalize(row.POSTCODE) === normalize(answers.postcode) &&
        normalize(row.CONSIGNMENT) === normalize(answers.consign) &&
        normalize(row["RECEIVER PHONE"]) === normalize(answers.phone) &&
        normalize(row["RECEIVER NAME"]) === normalize(answers.surname)
      );

      if (!match) {
        addMessage("❌ Thank you. Unfortunately, we couldn’t verify your details. Please double-check.", "bot");
        fallbackOption();
        return;
      }

      const eta = new Date(match.ETA.split('/').reverse().join('/'));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (eta >= tomorrow) {
        addMessage("✅ Thank you! Your delivery is on the way.", "bot");
        addMessage("📦 ETA: " + eta.toDateString(), "bot");
        return;
      }

      addMessage("Thanks. It looks like your delivery may require assistance from a live agent.", "bot");
      startLiveChat();
      return;
    }

    const step = steps[stepIndex];

    if (step.dependsOn && answers.topic !== step.dependsOn) {
      stepIndex++;
      return showStep();
    }

    if (step.type === 'smartChoice') {
      addMessage(step.text, 'bot');

      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.placeholder = "Type here or click a button...";
      txt.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && txt.value.trim()) {
          const userText = txt.value.trim();
          addMessage(userText, 'user');

          const guess = matchIntent(userText);
          if (guess) {
            input.innerHTML = '';
            addMessage(`Just to confirm, are you asking about: ${guess}?`, 'bot');

            const yesBtn = document.createElement('button');
            yesBtn.className = 'chat-btn';
            yesBtn.textContent = 'Yes';
            yesBtn.onclick = () => {
              answers[step.id] = guess;
              stepIndex++;
              showStep();
            };

            const noBtn = document.createElement('button');
            noBtn.className = 'chat-btn';
            noBtn.textContent = 'No';
            noBtn.onclick = () => {
              addMessage("No problem! Please click one of the buttons below or rephrase your question.", 'bot');
              showStep();
            };

            input.appendChild(yesBtn);
            input.appendChild(noBtn);
          } else {
            fallbackOption();
          }
        }
      });
      input.appendChild(txt);
      txt.focus();

      step.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'chat-btn';
        btn.textContent = choice;
        btn.onclick = () => {
          answers[step.id] = choice;
          addMessage(choice, 'user');
          addMessage(`Thanks, got that: ${choice}`, 'bot');
          stepIndex++;
          showStep();
        };
        input.appendChild(btn);
      });

    } else if (step.type === 'choice') {
      addMessage(step.text, 'bot');
      step.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'chat-btn';
        btn.textContent = choice;
        btn.onclick = () => {
          answers[step.id] = choice;
          addMessage(choice, 'user');
          addMessage(`Thanks, noted: ${choice}`, 'bot');
          stepIndex++;
          showStep();
        };
        input.appendChild(btn);
      });

    } else {
      addMessage(step.text, 'bot');
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && txt.value.trim()) {
          answers[step.id] = txt.value.trim();
          addMessage(txt.value.trim(), 'user');
          addMessage("Thanks for that.", 'bot');
          stepIndex++;
          showStep();
        }
      });
      input.appendChild(txt);
      txt.focus();
    }
  }

  addMessage("Welcome to Direct Freight Express! Please be aware that this chat may be used for accuracy and reporting purposes.", "bot");
  setTimeout(showStep, 800);
});
