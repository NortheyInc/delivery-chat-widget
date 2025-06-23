document.addEventListener('DOMContentLoaded', () => {
  let tableData = [];
  const steps = [
    { id: 'topic',    text: 'How can we assist you today?\nPlease click one of the buttons below, or write a brief sentence.', type: 'smartChoice', choices: ['Track Consignment','Pickups','Sales'] },
    { id: 'role',     text: 'Are you the Sender or Receiver?', type: 'choice',         choices: ['Sender','Receiver'], dependsOn: 'Track Consignment' },
    { id: 'postcode', text: 'Enter the Postcode:',                     type: 'input',          dependsOn: 'Track Consignment' },
    { id: 'consign',  text: 'Enter the Consignment Number:',           type: 'input',          dependsOn: 'Track Consignment' },
    { id: 'phone',    text: 'Enter your Phone Number:',                type: 'input',          dependsOn: 'Track Consignment' },
    { id: 'surname',  text: 'Enter your Surname:',                     type: 'input',          dependsOn: 'Track Consignment' }
  ];

  const chatBody  = document.getElementById('chat-body');
  const chatInput = document.getElementById('chat-input');
  let answers   = {};
  let stepIndex = 0;

  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function addMessage(txt, who) {
    if (who === 'bot') await delay(600);
    const el = document.createElement('div');
    el.className = `msg ${who}`;
    el.textContent = txt;
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function normalize(s) {
    return String(s||'').trim().toLowerCase().replace(/[^a-z0-9]/gi,'');
  }

  function matchIntent(txt) {
    const t = normalize(txt);
    if (/(track|where|delivery)/.test(t)) return 'Track Consignment';
    if (/(pickup|collect)/.test(t))            return 'Pickups';
    if (/(quote|price|sales)/.test(t))          return 'Sales';
    return null;
  }

  function isWeekend() {
    const d = new Date().getDay();
    return d === 0 || d === 6;
  }

  function startLiveChat() {
    if (isWeekend()) {
      addMessage("Thanks! Our live chat is unavailable on weekends. A team member will be in touch shortly.", 'bot');
      return;
    }
    addMessage("One moment please — we’re connecting you with a team member…", 'bot');
    sendEmailNotification(answers);
    window.open('https://northeyinc.github.io/live-chat/', '_blank');
  }

  function sendEmailNotification(data) {
    const msg = `
A customer has been escalated from the DFE Chat Bot.

- Topic: ${data.topic}
- Postcode: ${data.postcode}
- Consignment: ${data.consign}
- Phone: ${data.phone}
- Surname: ${data.surname}
- Role: ${data.role}

👉 Reply here: https://northeyinc.github.io/live-chat/
    `.trim();

    fetch('https://formsubmit.co/ajax/YOUR_EMAIL@example.com', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','Accept':'application/json' },
      body: JSON.stringify({ subject: "Live Chat Escalation", message: msg })
    });
  }

  function fallbackOption() {
    addMessage("Sorry, I didn’t quite catch that. Would you like to speak to someone instead?", 'bot');
    const btn = document.createElement('button');
    btn.className = 'chat-btn';
    btn.textContent = 'Talk to Us';
    btn.onclick = startLiveChat;
    chatInput.appendChild(btn);
  }

  async function showStep() {
    chatInput.innerHTML = '';

    // Completed all steps?
    if (stepIndex >= steps.length) {
      // non-track topics → escalate
      if (answers.topic !== 'Track Consignment') {
        await addMessage('Thanks—passing this to a team member.', 'bot');
        return startLiveChat();
      }

      // lookup in tableData
      const match = tableData.find(r =>
        normalize(r.POSTCODE)        === normalize(answers.postcode) &&
        normalize(r.CONSIGNMENT)     === normalize(answers.consign)  &&
        normalize(r['RECEIVER PHONE'])=== normalize(answers.phone)    &&
        normalize(r['RECEIVER NAME'])=== normalize(answers.surname)
      );

      if (!match) {
        await addMessage('❌ Couldn’t verify your details—please double-check.', 'bot');
        return fallbackOption();
      }

      const eta = match.ETA instanceof Date ? match.ETA : new Date(match.ETA);
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);

      if (eta >= tom) {
        await addMessage('✅ Your delivery is on the way.', 'bot');
        return addMessage('📦 ETA: ' + eta.toDateString(), 'bot');
      }

      await addMessage('Looks like you’ll need a live agent’s help.', 'bot');
      return startLiveChat();
    }

    // ask next question
    const step = steps[stepIndex];
    if (step.dependsOn && answers.topic !== step.dependsOn) {
      stepIndex++;
      return showStep();
    }

    await addMessage(step.text, 'bot');

    if (step.type === 'smartChoice') {
      // input + buttons
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.placeholder = 'Type here or click a button…';
      txt.addEventListener('keypress', e => {
        if (e.key === 'Enter' && txt.value.trim()) {
          addMessage(txt.value, 'user');
          const g = matchIntent(txt.value);
          if (!g) return fallbackOption();
          chatInput.innerHTML = '';
          addMessage(`Just to confirm: ${g}?`, 'bot');
          ['Yes','No'].forEach(ans => {
            const b = document.createElement('button');
            b.className = 'chat-btn';
            b.textContent = ans;
            b.onclick = async () => {
              await addMessage(ans, 'user');
              if (ans === 'Yes') {
                answers[step.id] = g;
                stepIndex++;
              }
              showStep();
            };
            chatInput.appendChild(b);
          });
        }
      });
      chatInput.appendChild(txt);
      txt.focus();

      step.choices.forEach(c => {
        const b = document.createElement('button');
        b.className = 'chat-btn';
        b.textContent = c;
        b.onclick = async () => {
          answers[step.id] = c;
          await addMessage(c, 'user');
          await addMessage(`Thanks, got that: ${c}`, 'bot');
          stepIndex++;
          showStep();
        };
        chatInput.appendChild(b);
      });

    } else if (step.type === 'choice') {
      // just buttons
      step.choices.forEach(c => {
        const b = document.createElement('button');
        b.className = 'chat-btn';
        b.textContent = c;
        b.onclick = async () => {
          answers[step.id] = c;
          await addMessage(c, 'user');
          await addMessage(`Thanks, noted: ${c}`, 'bot');
          stepIndex++;
          showStep();
        };
        chatInput.appendChild(b);
      });

    } else {
      // plain text input
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.addEventListener('keypress', e => {
        if (e.key === 'Enter' && txt.value.trim()) {
          answers[step.id] = txt.value.trim();
          addMessage(txt.value, 'user');
          addMessage('Thanks for that.', 'bot');
          stepIndex++;
          showStep();
        }
      });
      chatInput.appendChild(txt);
      txt.focus();
    }
  }

  // ── load Excel then start the chat ────────────────────────────
  fetch('data.xlsx')
    .then(r => r.arrayBuffer())
    .then(buf => {
      const wb    = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      tableData   = XLSX.utils.sheet_to_json(sheet);
    })
    .catch(err => {
      console.error('Excel load error:', err);
      addMessage('⚠️ Couldn’t load consignment data—live chat only.', 'bot');
    })
    .finally(() => {
      addMessage(
        'Welcome to Direct Freight Express! This chat may be used for accuracy and reporting purposes.',
        'bot'
      );
      setTimeout(showStep, 600);
    });
});
