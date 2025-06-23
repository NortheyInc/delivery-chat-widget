document.addEventListener('DOMContentLoaded', () => {
  // --- inline delivery data ---
  const deliveryData = [ /* your array of consignments... */ ];

  // --- conversational steps ---
  const steps = [
    { id: 'topic',   text: 'How can we assist you today?\n Please click on one of the below buttons or type a brief sentence.',  type: 'smartChoice', choices: ['Track Consignment','Pickups','Sales'] },
    { id: 'role',    text: 'Are you the Sender or Receiver?', type: 'choice',   choices: ['Sender','Receiver'], dependsOn: 'Track Consignment' },
    { id: 'postcode',text: 'Enter the Postcode:',           type: 'input',    dependsOn: 'Track Consignment' },
    { id: 'consign', text: 'Enter the Consignment Number:', type: 'input',    dependsOn: 'Track Consignment' },
    { id: 'phone',   text: 'Enter your Phone Number:',      type: 'input',    dependsOn: 'Track Consignment' },
    { id: 'surname', text: 'Enter your Surname:',           type: 'input',    dependsOn: 'Track Consignment' },
  ];

  const answers = {};
  let stepIndex = 0;
  const body  = document.getElementById('chat-body');
  const input = document.getElementById('chat-input');

  function addMessage(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerHTML = text.replace(/\n/g,'<br>');
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }

  function normalize(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,''); }

  function matchIntent(txt) {
    const t = normalize(txt);
    if (t.includes('track')||t.includes('delivery')||t.includes('where')) return 'Track Consignment';
    if (t.includes('pickup')||t.includes('collect')) return 'Pickups';
    if (t.includes('quote')||t.includes('price')||t.includes('sales')) return 'Sales';
    return null;
  }

  function isWeekend(){ const d=new Date().getDay(); return d===0||d===6; }

  function generateSessionId(){
    return Math.random().toString(36).substring(2,10);
  }

  function sendEmailNotification(data, session) {
    const bodyText = `
A customer has requested live chat from the DFE Chat Bot.
Session ID: ${session}

Their details:
- Topic: ${data.topic}
- Postcode: ${data.postcode}
- Consignment: ${data.consign}
- Phone: ${data.phone}
- Surname: ${data.surname}
- Role: ${data.role}

Click to join: https://${location.host}/support.html?session=${session}
    `.trim();

    fetch('https://formsubmit.co/ajax/peterno@directfreight.com.au', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({ subject: "Live Chat Request", message: bodyText })
    });
  }

  function startHandoff() {
    const session = generateSessionId();
    sendEmailNotification(answers, session);
    addMessage(
      `Thanks! We've emailed a link so we can chat in real time.<br>` +
      `<a href="support.html?session=${session}" target="_blank">Click here to join live chat</a>`,
      'bot'
    );
    // switch UI into free‐chat mode:
    input.innerHTML = '';
    const txt = document.createElement('input');
    txt.className = 'chat-text';
    txt.placeholder = 'Type your message here...';
    const btn = document.createElement('button');
    btn.className = 'chat-btn';
    btn.textContent = 'Send';
    input.append(txt, btn);

    // setup BroadcastChannel:
    const channel = new BroadcastChannel('dfe-chat-'+session);
    btn.onclick = () => {
      const t = txt.value.trim();
      if (!t) return;
      addMessage(t, 'user');
      channel.postMessage({ sender:'user', text: t });
      txt.value = '';
    };
    txt.addEventListener('keypress', e => {
      if (e.key==='Enter') btn.click();
    });
    channel.onmessage = ev => {
      addMessage(ev.data.text, 'agent');
    };
  }

  function fallback() {
    addMessage("Sorry, I didn’t catch that. Talk to us directly?", 'bot');
    input.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'chat-btn';
    btn.textContent = 'Talk to Us';
    btn.onclick = startHandoff;
    input.appendChild(btn);
  }

  function showStep() {
    input.innerHTML = '';
    if (stepIndex >= steps.length) {
      if (answers.topic !== 'Track Consignment') {
        addMessage("Thanks, we’ll connect you now.", 'bot');
        return startHandoff();
      }
      // verify details
      const match = deliveryData.find(r =>
        normalize(r.POSTCODE)===normalize(answers.postcode) &&
        normalize(r.CONSIGNMENT)===normalize(answers.consign) &&
        normalize(r['RECEIVER PHONE'])===normalize(answers.phone) &&
        normalize(r['RECEIVER NAME'])===normalize(answers.surname)
      );
      if (!match) {
        addMessage("❌ We couldn’t verify your details. Please recheck.", 'bot');
        return fallback();
      }
      const eta = new Date(match.ETA.split('/').reverse().join('/'));
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
      if (eta >= tomorrow) {
        addMessage("✅ Your delivery is on the way!", 'bot');
        addMessage("📦 ETA: " + eta.toDateString(), 'bot');
        return;
      }
      addMessage("Looks like we need a live agent on this.", 'bot');
      return startHandoff();
    }

    const step = steps[stepIndex];
    if (step.dependsOn && answers.topic !== step.dependsOn) {
      stepIndex++;
      return showStep();
    }

    addMessage(step.text, 'bot');
    if (step.type==='smartChoice') {
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.placeholder = 'Type or click…';
      input.appendChild(txt);
      txt.focus();

      txt.addEventListener('keypress', e => {
        if (e.key==='Enter' && txt.value.trim()) {
          const u = txt.value.trim();
          addMessage(u, 'user');
          const intent = matchIntent(u);
          if (intent) {
            input.innerHTML = '';
            addMessage(`Confirm: ${intent}?`, 'bot');
            ['Yes','No'].forEach(lbl=>{
              const b=document.createElement('button');
              b.className='chat-btn';
              b.textContent=lbl;
              b.onclick=()=> {
                if (lbl==='Yes') {
                  answers[step.id]=intent;
                  stepIndex++;
                }
                showStep();
              };
              input.appendChild(b);
            });
          } else fallback();
        }
      });

      step.choices.forEach(choice => {
        const b=document.createElement('button');
        b.className='chat-btn';
        b.textContent=choice;
        b.onclick=()=>{
          answers[step.id]=choice;
          addMessage(choice,'user');
          stepIndex++;
          showStep();
        };
        input.appendChild(b);
      });

    } else if (step.type==='choice') {
      step.choices.forEach(choice=>{
        const b=document.createElement('button');
        b.className='chat-btn';
        b.textContent=choice;
        b.onclick=()=>{
          answers[step.id]=choice;
          addMessage(choice,'user');
          stepIndex++;
          showStep();
        };
        input.appendChild(b);
      });

    } else {
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      input.appendChild(txt);
      txt.focus();
      txt.addEventListener('keypress', e=>{
        if (e.key==='Enter' && txt.value.trim()){
          answers[step.id]=txt.value.trim();
          addMessage(txt.value.trim(),'user');
          stepIndex++;
          showStep();
        }
      });
    }
  }

  // kick it off:
  addMessage("Welcome to Direct Freight Express! \n This chat is monitered for security and training purposes.", "bot");
  setTimeout(showStep, 800);
});
