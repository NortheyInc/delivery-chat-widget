document.addEventListener('DOMContentLoaded', function () {
  let tableData = [];
  fetch('data.xlsx')
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      tableData = XLSX.utils.sheet_to_json(sheet);
    });

  const steps = [
    {
      id: 'topic',
      text: 'How can we assist you today? \n Please click on one of the buttons below, or write a brief sentence.',
      type: 'smartChoice',
      choices: ['Track Consignment', 'Pickups', 'Sales']
    },
    { id: 'role',      text: 'Are you the Sender or Receiver?',         type: 'choice', choices: ['Sender', 'Receiver'], dependsOn: 'Track Consignment' },
    { id: 'postcode',  text: 'Enter the Postcode:',                     type: 'input', dependsOn: 'Track Consignment' },
    { id: 'consign',   text: 'Enter the Consignment Number:',           type: 'input', dependsOn: 'Track Consignment' },
    { id: 'phone',     text: 'Enter your Phone Number:',                type: 'input', dependsOn: 'Track Consignment' },
    { id: 'surname',   text: 'Enter your Surname:',                     type: 'input', dependsOn: 'Track Consignment' }
  ];

  let answers = {};
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
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  function matchIntent(userInput) {
    const text = normalize(userInput);
    if (text.includes("track") || text.includes("where") || text.includes("delivery")) return "Track Consignment";
    if (text.includes("pickup") || text.includes("collect") || text.includes("pick up")) return "Pickups";
    if (text.includes("quote") || text.includes("price") || text.includes("sales")) return "Sales";
    return null;
  }

  function isWeekend() {
    const today = new Date().getDay();
    return today === 0 || today === 6;
  }

  function startLiveChat() {
    if (isWeekend()) {
      addMessage("Thanks! Our live chat is unavailable on weekends. A team member will be in touch shortly.", "bot");
      return;
    }

    addMessage('One moment please — we’re connecting you with a team member…', 'bot');
    sendEmailNotification(answers);
    window.open('https://northeyinc.github.io/live-chat/', '_blank');
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
    btn.onclick = () => {
      startLiveChat();
    };
    input.appendChild(btn);
  }

  function showStep() {
    input.innerHTML = '';

    if (stepIndex >= steps.length) {
      if (answers.topic !== 'Track Consignment') {
        addMessage('Thanks for letting us know. We’ll pass this to a team member.', 'bot');
        startLiveChat();
        return;
      }

      const match = tableData.find(row =>
        normalize(row['POSTCODE']) === normalize(answers.postcode) &&
        normalize(row['CONSIGNMENT']) === normalize(answers.consign) &&
        normalize(row['RECEIVER PHONE']) === normalize(answers.phone) &&
        normalize(row['RECEIVER NAME']) === normalize(answers.surname)
      );

      if (!match) {
        addMessage('❌ Thank you. Unfortunately, we couldn’t verify your details. Please double-check.', 'bot');
        fallbackOption();
        return;
      }

      const eta = new Date(match.ETA);
      const todayPlus1 = new Date();
      todayPlus1.setDate(todayPlus1.getDate() + 1);

      if (eta >= todayPlus1) {
        addMessage('✅ Thank you! Your delivery is on the way.', 'bot');
        addMessage('📦 ETA: ' + eta.toDateString(), 'bot');
        return;
      }

      addMessage('Thanks. It looks like your delivery may require assistance from a live agent.', 'bot');
      startLiveChat();
      return;
    }

    const step = steps[stepIndex];

    if (step.dependsOn && answers['topic'] !== step.dependsOn) {
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
              showStep(); // restart step
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

  addMessage(
    'Welcome to Direct Freight Express! Please be aware that this chat may be used for accuracy and reporting purposes.',
    'bot'
  );
  setTimeout(showStep, 800);
});
