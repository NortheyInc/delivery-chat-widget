;(function(){
  // —──────── CONFIG & STATE ─────────—
  const DELIVERY_DATA = [
    { CONSIGNMENT:"9999912345678", ETA:"23/06/2025", "RECEIVER NAME":"Northey", POSTCODE:"4221", "RECEIVER PHONE":"0403642769" },
    { CONSIGNMENT:"1111198765432", ETA:"23/06/2025", "RECEIVER NAME":"Catania", POSTCODE:"2142", "RECEIVER PHONE":"0297218106" },
    { CONSIGNMENT:"2222212345678", ETA:"24/06/2025", "RECEIVER NAME":"Cipolla", POSTCODE:"2028", "RECEIVER PHONE":"0492847511" },
    { CONSIGNMENT:"6666698765432", ETA:"24/06/2025", "RECEIVER NAME":"Smith",   POSTCODE:"2000", "RECEIVER PHONE":"0404498449" }
  ];

  const STEPS = [
    { id:'topic',    text:'Hello! How may I assist you today? 😊', type:'smartChoice', choices:['Track Consignment','Pickups','Sales'] },
    { id:'role',     text:'Are you the Sender or Receiver, please?', type:'choice',      choices:['Sender','Receiver'], dependsOn:'Track Consignment' },
    { id:'postcode', text:'Please enter the Postcode:',            type:'input',       dependsOn:'Track Consignment' },
    { id:'consign',  text:'Please enter the Consignment Number:', type:'input',       dependsOn:'Track Consignment' },
    { id:'phone',    text:'Please enter your Phone Number:',      type:'input',       dependsOn:'Track Consignment' },
    { id:'surname',  text:'Please enter your Surname:',           type:'input',       dependsOn:'Track Consignment' }
  ];

  const STATE = { answers: {}, idx: 0, channel: null };

  // —──────── UTILITIES ─────────—
  function scrollToBottom() {
    STATE.body.scrollTop = STATE.body.scrollHeight;
  }
  function normalize(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,''); }
  function matchIntent(t) {
    const u = normalize(t);
    if(/track|delivery|where/.test(u)) return 'Track Consignment';
    if(/pickup|collect/.test(u))          return 'Pickups';
    if(/quote|price|sales/.test(u))       return 'Sales';
    return null;
  }
  function isWeekend(){ return [0,6].includes(new Date().getDay()); }
  function makeId(){ return Math.random().toString(36).slice(2,10); }

  // —──────── MESSAGE RENDERER ─────────—
  function addMessage(txt, who='bot', delay=600) {
    setTimeout(() => {
      const m = document.createElement('div');
      m.className = `msg ${who}`;
      m.setAttribute('role','article');
      m.setAttribute('aria-live','polite');

      const avatar = document.createElement('div');
      avatar.className = `avatar ${who}`;

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = txt.replace(/\n/g,'<br>');

      const ts = document.createElement('time');
      ts.className = 'ts';
      ts.dateTime = new Date().toISOString();
      ts.textContent = new Date().toLocaleTimeString();

      m.append(avatar, bubble, ts);
      STATE.body.appendChild(m);
      scrollToBottom();
    }, delay);
  }

  // —──────── VALIDATORS ─────────—
  function validatePostcode(s){ return /^\d{4}$/.test(s); }
  function validatePhone(s){ return /^0[23478]\d{8}$/.test(s); }
  function validateConsignment(s){ return /^\d{13}$/.test(s); }

  // —──────── RENDER HELPERS ─────────—
  function renderSmartChoice(step) {
    addMessage(step.text, 'bot');
    const cdiv = document.createElement('div');
    cdiv.className = 'choice-container';
    step.choices.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'chat-btn';
      btn.textContent = ch;
      btn.onclick = () => {
        STATE.answers[step.id] = ch;
        addMessage(ch, 'user');
        STATE.idx++;
        showStep();
      };
      cdiv.append(btn);
    });
    const wrap = document.createElement('div');
    const txt = document.createElement('input');
    txt.className = 'chat-text';
    txt.placeholder = 'Or type…';
    wrap.append(txt);
    STATE.body.append(cdiv, wrap);
    txt.focus();
    txt.addEventListener('keypress', e => {
      if (e.key==='Enter' && txt.value.trim()) {
        const u = txt.value.trim();
        addMessage(u, 'user');
        wrap.remove();
        const intent = matchIntent(u);
        if (intent) confirmIntent(intent);
        else askLiveAgentConsent();
      }
    });
  }

  function renderChoice(step) {
    addMessage(step.text, 'bot');
    STATE.inputPane.innerHTML = '';
    step.choices.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'chat-btn';
      btn.textContent = ch;
      btn.onclick = () => {
        STATE.answers[step.id] = ch;
        addMessage(ch, 'user');
        STATE.idx++;
        showStep();
      };
      STATE.inputPane.append(btn);
    });
  }

  function renderInput(step) {
    addMessage(step.text, 'bot');
    STATE.inputPane.innerHTML = '';
    const txt = document.createElement('input');
    txt.className = 'chat-text';
    STATE.inputPane.append(txt);
    txt.focus();
    txt.addEventListener('keypress', e => {
      if (e.key==='Enter' && txt.value.trim()) {
        const v = txt.value.trim();
        let valid = true, errMsg = '';
        if (step.id==='postcode' && !validatePostcode(v)) {
          valid = false; errMsg = 'Postcode must be 4 digits.';
        }
        if (step.id==='phone' && !validatePhone(v)) {
          valid = false; errMsg = 'Phone must be 10 digits, start 02/03/04/07/08.';
        }
        if (step.id==='consign' && !validateConsignment(v)) {
          valid = false; errMsg = 'Consignment no. must be 13 digits.';
        }
        if (!valid) {
          const err = document.createElement('div');
          err.className = 'error';
          err.textContent = errMsg;
          STATE.inputPane.append(err);
          return;
        }
        STATE.answers[step.id] = v;
        addMessage(v, 'user');
        STATE.idx++;
        showStep();
      }
    });
  }

  function confirmIntent(intent) {
    STATE.inputPane.innerHTML = '';
    addMessage(`Please confirm: ${intent}?`, 'bot');
    ['Yes','No'].forEach(lbl => {
      const b = document.createElement('button');
      b.className = 'chat-btn';
      b.textContent = lbl;
      b.onclick = () => {
        addMessage(lbl, 'user');
        if (lbl==='Yes') {
          STATE.answers.topic = intent;
          STATE.idx++;
        } else {
          addMessage("Alright, please choose again or rephrase. 😊",'bot');
        }
        showStep();
      };
      STATE.inputPane.append(b);
    });
  }

  // —──────── FINALIZATION & HANDOFF ─────────—
  function finalizeFlow(){
    if (STATE.answers.topic !== 'Track Consignment') {
      addMessage("Certainly, connecting you now…", 'bot');
      return askLiveAgentConsent();
    }
    const m = DELIVERY_DATA.find(r =>
      normalize(r.POSTCODE) === normalize(STATE.answers.postcode) &&
      normalize(r.CONSIGNMENT) === normalize(STATE.answers.consign) &&
      normalize(r['RECEIVER PHONE']) === normalize(STATE.answers.phone) &&
      normalize(r['RECEIVER NAME']) === normalize(STATE.answers.surname)
    );
    if (!m) return askLiveAgentConsent();
    addMessage("Thank you. We have matched your information.", 'bot');
    addMessage("How may I assist you further?", 'bot');
  }

  function startAgentHandoff() {
    if (isWeekend()) {
      addMessage("I’m sorry, live chat isn’t available on weekends. A representative will follow up promptly. 🙏", 'bot');
      return;
    }
    const sid = makeId();
    const link = `${location.origin+location.pathname}?agent=true&session=${sid}`;
    fetch('https://formsubmit.co/ajax/peterno@directfreight.com.au', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({ subject:'Live Chat Request', message:`Session: ${sid}\nJoin as agent: ${link}` })
    });
    STATE.channel = new BroadcastChannel('dfe-chat-'+sid);
    addMessage("Thank you. A representative will join shortly…", 'bot');
    STATE.inputPane.innerHTML = '';
    const txtC = document.createElement('input');
    const btnC = document.createElement('button');
    txtC.className='chat-text'; txtC.placeholder='Type your message…';
    btnC.className='chat-btn';   btnC.textContent='Send';
    STATE.inputPane.append(txtC,btnC);
    btnC.onclick = () => {
      const t = txtC.value.trim(); if(!t) return;
      addMessage(t,'user');
      STATE.channel.postMessage({sender:'user',text:t});
      txtC.value='';
    };
    txtC.addEventListener('keypress', e => { if(e.key==='Enter') btnC.click(); });
    STATE.channel.onmessage = e => addMessage(e.data.text,'agent',0);
  }

  function askLiveAgentConsent() {
    addMessage("I’m sorry, I couldn’t verify your details. Would you like to talk to a live customer service representative? Please reply Yes or No.", 'bot');
    STATE.inputPane.innerHTML = '';
    ['Yes','No'].forEach(label => {
      const b = document.createElement('button');
      b.className='chat-btn'; b.textContent=label;
      b.onclick = () => {
        addMessage(label,'user');
        if(label==='Yes') startAgentHandoff();
        else addMessage("No problem. Please let me know how else I may assist you. 😊", 'bot');
      };
      STATE.inputPane.append(b);
    });
  }

  // —──────── DIALOG FLOW ─────────—
  function showStep() {
    if (STATE.idx >= STEPS.length) {
      return finalizeFlow();
    }
    const step = STEPS[STATE.idx];
    if (step.dependsOn && STATE.answers.topic !== step.dependsOn) {
      STATE.idx++;
      return showStep();
    }
    switch (step.type) {
      case 'smartChoice': renderSmartChoice(step); break;
      case 'choice':      renderChoice(step);       break;
      case 'input':       renderInput(step);        break;
    }
  }

  // —──────── BOOTSTRAP CHAT ─────────—
  document.addEventListener('DOMContentLoaded', () => {
    STATE.body      = document.getElementById('chat-body');
    STATE.inputPane = document.getElementById('chat-input');

    const params = new URLSearchParams(location.search);
    const isAgent = params.get('agent')==='true';
    const session = params.get('session');
    if (isAgent && session) {
      document.getElementById('chat-title').textContent = 'Agent Console';
      STATE.channel = new BroadcastChannel('dfe-chat-'+session);
      addMessage(`🔗 Connected to session ${session}`, 'agent', 0);
      const txtA = document.createElement('input');
      const btnA = document.createElement('button');
      txtA.className='chat-text'; txtA.placeholder='Type your message…';
      btnA.className='chat-btn';   btnA.textContent='Send';
      STATE.inputPane.append(txtA,btnA);
      btnA.onclick = ()=>{ 
        const t=txtA.value.trim(); if(!t) return;
        addMessage(t,'agent',0);
        STATE.channel.postMessage({sender:'agent',text:t});
        txtA.value='';
      };
      txtA.addEventListener('keypress',e=>{ if(e.key==='Enter') btnA.click(); });
      STATE.channel.onmessage = e => addMessage(e.data.text,e.data.sender==='agent'?'agent':'user',0);
      return;
    }

    addMessage("Welcome to Direct Freight Express! This chat is monitored for accuracy & reporting purposes. 🙏", 'bot', 0);
    setTimeout(showStep, 800);
  });

})();
