document.addEventListener('DOMContentLoaded', () => {
  // ── INLINE CONSIGNMENT DATA ───────────────────────────────────
  const tableData = [
    {
      CONSIGNMENT: '9999912345678',
      ETA: new Date('2025-06-23'),
      'RECEIVER NAME': 'Peter Northey',
      'ADDRESS 1': '2 City Link Drive',
      'ADDRESS 2': '',
      SUBURB: 'Cararra',
      POSTCODE: '4221',
      'RECEIVER PHONE': '0403642769'
    },
    {
      CONSIGNMENT: '1111198765432',
      ETA: new Date('2025-06-23'),
      'RECEIVER NAME': 'Stephen Catania',
      'ADDRESS 1': 'Rosehill Gardens',
      'ADDRESS 2': 'James Ruse Drive',
      SUBURB: 'Rosehill',
      POSTCODE: '2142',
      'RECEIVER PHONE': '0297218106'
    },
    {
      CONSIGNMENT: '2222212345678',
      ETA: new Date('2025-06-24'),
      'RECEIVER NAME': 'Peter Cipolla',
      'ADDRESS 1': 'Kings Mansion',
      'ADDRESS 2': '',
      SUBURB: 'Double Bay',
      POSTCODE: '2028',
      'RECEIVER PHONE': '0492847511'
    },
    {
      CONSIGNMENT: '6666698765432',
      ETA: new Date('2025-06-24'),
      'RECEIVER NAME': 'Austin Smith',
      'ADDRESS 1': '42 Wallaby Way',
      'ADDRESS 2': '',
      SUBURB: 'Sydney',
      POSTCODE: '2000',
      'RECEIVER PHONE': '0404498449'
    }
  ];

  const steps = [
    { id: 'topic',   text: 'How can we assist you today?\nPlease click on one of the buttons below, or write a brief sentence.', type: 'smartChoice', choices: ['Track Consignment','Pickups','Sales'] },
    { id: 'role',    text: 'Are you the Sender or Receiver?', type: 'choice', choices: ['Sender','Receiver'], dependsOn: 'Track Consignment' },
    { id: 'postcode',text: 'Enter the Postcode:', type: 'input', dependsOn: 'Track Consignment' },
    { id: 'consign', text: 'Enter the Consignment Number:', type: 'input', dependsOn: 'Track Consignment' },
    { id: 'phone',   text: 'Enter your Phone Number:', type: 'input', dependsOn: 'Track Consignment' },
    { id: 'surname', text: 'Enter your Surname:', type: 'input', dependsOn: 'Track Consignment' }
  ];

  const bodyDiv  = document.getElementById('chat-body');
  const inputDiv = document.getElementById('chat-input');
  let answers   = {};
  let stepIndex = 0;

  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function addMessage(txt, who) {
    if (who === 'bot') await delay(600);
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = txt;
    bodyDiv.appendChild(d);
    bodyDiv.scrollTop = bodyDiv.scrollHeight;
  }

  function normalize(s) {
    return String(s||'').trim().toLowerCase().replace(/[^a-z0-9]/gi,'');
  }

  function matchIntent(txt) {
    const t = normalize(txt);
    if (/(track|where|delivery)/.test(t)) return 'Track Consignment';
    if (/(pickup|collect)/.test(t)) return 'Pickups';
    if (/(quote|price|sales)/.test(t)) return 'Sales';
    return null;
  }

  function isWeekend() {
    const d = new Date().getDay();
    return d===0||d===6;
  }

  function startLiveChat() {
    if (isWeekend()) {
      addMessage("Thanks! Our live chat is unavailable on weekends. A team member will be in touch shortly.", 'bot');
      return;
    }
    addMessage("One moment please — we’re connecting you with a team member…", 'bot');
    sendEmailNotification(answers);
    window.open('https://northeyinc.github.io/live-chat/','_blank');
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

👉 Reply: https://northeyinc.github.io/live-chat/
    `.trim();

    fetch('https://formsubmit.co/ajax/YOUR_EMAIL@example.com', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','Accept':'application/json' },
      body: JSON.stringify({ subject:"Live Chat Escalation", message: msg })
    });
  }

  function fallbackOption() {
    addMessage("Sorry, I didn’t quite catch that. Would you like to speak to someone instead?", 'bot');
    const b = document.createElement('button');
    b.className = 'chat-btn';
    b.textContent = 'Talk to Us';
    b.onclick = startLiveChat;
    inputDiv.appendChild(b);
  }

  async function showStep() {
    inputDiv.innerHTML = '';

    if (stepIndex >= steps.length) {
      if (answers.topic !== 'Track Consignment') {
        await addMessage('Thanks—passing to a team member.', 'bot');
        return startLiveChat();
      }

      const match = tableData.find(r => 
        normalize(r.POSTCODE)    === normalize(answers.postcode) &&
        normalize(r.CONSIGNMENT) === normalize(answers.consign) &&
        normalize(r['RECEIVER PHONE']) === normalize(answers.phone) &&
        normalize(r['RECEIVER NAME'])  === normalize(answers.surname)
      );

      if (!match) {
        await addMessage('❌ Could not verify your details—please double-check.', 'bot');
        return fallbackOption();
      }

      const eta = match.ETA;
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

      if (eta >= tomorrow) {
        await addMessage('✅ Your delivery is on the way.', 'bot');
        return addMessage('📦 ETA: ' + eta.toDateString(), 'bot');
      }

      await addMessage('Looks like you’ll need a live agent’s help.', 'bot');
      return startLiveChat();
    }

    const step = steps[stepIndex];
    if (step.dependsOn && answers.topic !== step.dependsOn) {
      stepIndex++;
      return showStep();
    }

    await addMessage(step.text, 'bot');

    if (step.type === 'smartChoice') {
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.placeholder = 'Type here or click a button…';
      txt.addEventListener('keypress', e => {
        if (e.key==='Enter' && txt.value.trim()) {
          addMessage(txt.value,'user');
          const guess = matchIntent(txt.value);
          if (!guess) return fallbackOption();
          inputDiv.innerHTML = '';
          addMessage(`Just to confirm: ${guess}?`,'bot');
          ['Yes','No'].forEach(ans=>{
            const btn = document.createElement('button');
            btn.className='chat-btn';
            btn.textContent=ans;
            btn.onclick=async()=>{
              await addMessage(ans,'user');
              if (ans==='Yes') { answers[step.id]=guess; stepIndex++; }
              showStep();
            };
            inputDiv.appendChild(btn);
          });
        }
      });
      inputDiv.appendChild(txt);
      txt.focus();

      step.choices.forEach(c=>{
        const btn = document.createElement('button');
        btn.className='chat-btn';
        btn.textContent=c;
        btn.onclick=async()=>{
          answers[step.id]=c;
          await addMessage(c,'user');
          await addMessage(`Thanks, got that: ${c}`,'bot');
          stepIndex++;
          showStep();
        };
        inputDiv.appendChild(btn);
      });

    } else if (step.type === 'choice') {
      step.choices.forEach(c=>{
        const btn = document.createElement('button');
        btn.className='chat-btn';
        btn.textContent=c;
        btn.onclick=async()=>{
          answers[step.id]=c;
          await addMessage(c,'user');
          await addMessage(`Thanks, noted: ${c}`,'bot');
          stepIndex++;
          showStep();
        };
        inputDiv.appendChild(btn);
      });

    } else {
      const txt = document.createElement('input');
      txt.className='chat-text';
      txt.addEventListener('keypress', e => {
        if (e.key==='Enter' && txt.value.trim()) {
          answers[step.id]=txt.value.trim();
          addMessage(txt.value,'user');
          addMessage('Thanks for that.','bot');
          stepIndex++;
          showStep();
        }
      });
      inputDiv.appendChild(txt);
      txt.focus();
    }
  }

  // Start the conversation
  addMessage(
    'Welcome to Direct Freight Express! This chat may be used for accuracy and reporting.',
    'bot'
  );
  setTimeout(showStep, 600);
});
