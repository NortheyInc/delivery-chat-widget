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
    { id: 'topic',     text: 'How can we assist you today? Please click on one of the buttons below, or write a brief sentence.', type: 'choice', choices: ['Track Consignment', 'Pickups', 'Sales'] },
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
    return String(str || '').trim().toLowerCase().replace(/\s+/g, '');
  }

  function startLiveChat() {
    addMessage('Connecting you to a live agent…', 'bot');
    sendEmailNotification(answers);
    window.open('https://northeyinc.github.io/live-chat/', '_blank');
  }

  function sendEmailNotification(data) {
    const subject = encodeURIComponent("DFE Live Chat Escalation");
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

  function showStep() {
    input.innerHTML = '';

    if (stepIndex >= steps.length) {
      if (answers.topic !== 'Track Consignment') {
        addMessage('We’ll pass your query to a live agent.', 'bot');
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
        addMessage('❌ Sorry, we couldn’t verify your details. Please double-check.', 'bot');
        return;
      }

      const eta = new Date(match.ETA);
      const todayPlus1 = new Date();
      todayPlus1.setDate(todayPlus1.getDate() + 1);

      if (eta >= todayPlus1) {
        addMessage('✅ Thanks! Your delivery is on the way.', 'bot');
        addMessage('ETA: ' + eta.toDateString(), 'bot');
        return;
      }

      addMessage('Your delivery may require assistance from a live agent.', 'bot');
      startLiveChat();
      return;
    }

    const step = steps[stepIndex];
    if (step.dependsOn && answers['topic'] !== step.dependsOn) {
      stepIndex++;
      return showStep();
    }

    addMessage(step.text, 'bot');

    if (step.type === 'choice') {
      step.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'chat-btn';
        btn.textContent = choice;
        btn.onclick = () => {
          answers[step.id] = choice;
          addMessage(choice, 'user');
          stepIndex++;
          showStep();
        };
        input.appendChild(btn);
      });
    } else {
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && txt.value.trim()) {
          answers[step.id] = txt.value.trim();
          addMessage(txt.value.trim(), 'user');
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
