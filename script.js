document.addEventListener('DOMContentLoaded', () => {
  // —───────────── SESSION SETUP ─────────────—
  const params   = new URLSearchParams(location.search);
  const session  = params.get('session');
  const isAgent  = params.get('agent') === 'true';
  let channel;

  // —──────────── DELIVERY DATA & STEPS ─────────────—
  const deliveryData = [
    { CONSIGNMENT:"9999912345678", ETA:"23/06/2025", "RECEIVER NAME":"Northey", POSTCODE:"4221", "RECEIVER PHONE":"0403642769" },
    { CONSIGNMENT:"1111198765432", ETA:"23/06/2025", "RECEIVER NAME":"Catania", POSTCODE:"2142", "RECEIVER PHONE":"0297218106" },
    { CONSIGNMENT:"2222212345678", ETA:"24/06/2025", "RECEIVER NAME":"Cipolla", POSTCODE:"2028", "RECEIVER PHONE":"0492847511" },
    { CONSIGNMENT:"6666698765432", ETA:"24/06/2025", "RECEIVER NAME":"Smith",   POSTCODE:"2000", "RECEIVER PHONE":"0404498449" }
  ];
  const steps = [
    { id:'topic',    text:'How can we assist you today?', type:'smartChoice', choices:['Track Consignment','Pickups','Sales'] },
    { id:'role',     text:'Are you the Sender or Receiver?', type:'choice',      choices:['Sender','Receiver'], dependsOn:'Track Consignment' },
    { id:'postcode', text:'Enter the Postcode:',            type:'input',       dependsOn:'Track Consignment' },
    { id:'consign',  text:'Enter the Consignment Number:',  type:'input',       dependsOn:'Track Consignment' },
    { id:'phone',    text:'Enter your Phone Number:',       type:'input',       dependsOn:'Track Consignment' },
    { id:'surname',  text:'Enter your Surname:',            type:'input',       dependsOn:'Track Consignment' }
  ];

  // —──────────── ELEMENTS & STATE ─────────────—
  const body      = document.getElementById('chat-body');
  const inputPane = document.getElementById('chat-input');
  let answers = {}, idx = 0;

  // —──────────── UTILITIES ─────────────—
  function addMessage(txt, who='bot', delay=500) {
    setTimeout(() => {
      const m = document.createElement('div');
      m.className = `msg ${who}`;
      m.innerHTML = txt.replace(/\n/g,'<br>');
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
    }, delay);
  }
  function normalize(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,''); }
  function matchIntent(t) {
    const u=normalize(t);
    if(/track|delivery|where/.test(u)) return 'Track Consignment';
    if(/pickup|collect/.test(u))          return 'Pickups';
    if(/quote|price|sales/.test(u))       return 'Sales';
    return null;
  }
  function isWeekend(){ const d=new Date().getDay(); return d===0||d===6; }
  function makeId(){ return Math.random().toString(36).slice(2,10); }

  // —────────── AGENT MODE ──────────—
  if (isAgent && session) {
    document.getElementById('chat-title').textContent = 'Agent Console';
    channel = new BroadcastChannel('dfe-chat-'+session);
    addMessage(`🔗 Connected to session ${session}`, 'agent', 0);

    // agent input
    const txtA = document.createElement('input');
    const btnA = document.createElement('button');
    txtA.className='chat-text'; txtA.placeholder='Type a message…';
    btnA.className='chat-btn';   btnA.textContent='Send';
    inputPane.append(txtA, btnA);

    btnA.onclick = () => {
      const t=txtA.value.trim(); if(!t) return;
      addMessage(t,'agent',0);
      channel.postMessage({sender:'agent',text:t});
      txtA.value='';
    };
    txtA.addEventListener('keypress',e=>{ if(e.key==='Enter') btnA.click(); });
    channel.onmessage = e=> addMessage(e.data.text, e.data.sender==='agent'?'agent':'user',0);
    return;
  }

  // —────────── CUSTOMER FLOW ──────────—
  channel = session
    ? new BroadcastChannel('dfe-chat-'+session)
    : null;

  function startAgentHandoff() {
    if (isWeekend()) {
      addMessage("Live chat is unavailable on weekends. We’ll get back to you ASAP.", 'bot');
      return;
    }
    const sid = makeId();
    // email agent
    const link = `${location.origin + location.pathname}?agent=true&session=${sid}`;
    fetch('https://formsubmit.co/ajax/peterno@directfreight.com.au', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({
        subject:'Live Chat Request',
        message:`Session: ${sid}\nJoin: ${link}`
      })
    });
    // open channel & show link
    channel = new BroadcastChannel('dfe-chat-'+sid);
    addMessage(`✅ You’re now connected. Agent will join shortly.`, 'bot', 500);
    inputPane.innerHTML='';
    const txtC = document.createElement('input');
    const btnC = document.createElement('button');
    txtC.className='chat-text'; txtC.placeholder='Type message…';
    btnC.className='chat-btn'; btnC.textContent='Send';
    inputPane.append(txtC, btnC);

    btnC.onclick = ()=>{
      const t=txtC.value.trim(); if(!t) return;
      addMessage(t,'user',0);
      channel.postMessage({sender:'user',text:t});
      txtC.value='';
    };
    txtC.addEventListener('keypress',e=>{ if(e.key==='Enter') btnC.click(); });
    channel.onmessage = e=> addMessage(e.data.text,'agent',0);
  }

  function fallback() {
    addMessage("Sorry, I didn’t understand. Talk to us directly?", 'bot');
    inputPane.innerHTML='';
    const b=document.createElement('button');
    b.className='chat-btn'; b.textContent='Talk to Us';
    b.onclick = startAgentHandoff;
    inputPane.append(b);
  }

  function showStep() {
    inputPane.innerHTML='';
    if (idx>=steps.length) {
      if (answers.topic!=='Track Consignment') {
        addMessage("Alright, connecting you now…", 'bot');
        return startAgentHandoff();
      }
      // verify
      const m = deliveryData.find(r =>
        normalize(r.POSTCODE)===normalize(answers.postcode) &&
        normalize(r.CONSIGNMENT)===normalize(answers.consign) &&
        normalize(r['RECEIVER PHONE'])===normalize(answers.phone) &&
        normalize(r['RECEIVER NAME'])===normalize(answers.surname)
      );
      if (!m) return fallback();
      const etaDate = new Date(m.ETA.split('/').reverse().join('/'));
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
      if (etaDate >= tomorrow) {
        addMessage("Your delivery is on the way! 📦", 'bot');
        addMessage("ETA: " + etaDate.toDateString(), 'bot');
        return;
      }
      addMessage("Let me connect you to an agent…", 'bot');
      return startAgentHandoff();
    }

    const step=steps[idx];
    if (step.dependsOn && answers.topic!==step.dependsOn) {
      idx++; return showStep();
    }

    addMessage(step.text,'bot');
    if (step.type==='smartChoice') {
      // choices inline
      const cdiv=document.createElement('div');
      cdiv.className='choice-container';
      step.choices.forEach(ch=>{
        const btn=document.createElement('button');
        btn.className='chat-btn'; btn.textContent=ch;
        btn.onclick=()=>{
          answers[step.id]=ch;
          addMessage(ch,'user');
          idx++; showStep();
        };
        cdiv.append(btn);
      });
      body.append(cdiv);
      // free-text under
      const wrap=document.createElement('div');
      const txt=document.createElement('input');
      txt.className='chat-text'; txt.placeholder='Or type…';
      wrap.append(txt); body.append(wrap);
      txt.focus();
      txt.addEventListener('keypress',e=>{
        if(e.key==='Enter'&&txt.value.trim()){
          const u=txt.value.trim();
          addMessage(u,'user');
          wrap.remove();
          const intent=matchIntent(u);
          if(intent){
            inputPane.innerHTML='';
            addMessage(`Confirm: ${intent}?`,'bot');
            ['Yes','No'].forEach(lbl=>{
              const b=document.createElement('button');
              b.className='chat-btn'; b.textContent=lbl;
              b.onclick=()=>{
                if(lbl==='Yes'){ answers[step.id]=intent; idx++ }
                showStep();
              };
              inputPane.append(b);
            });
          } else fallback();
        }
      });
    }
    else if (step.type==='choice') {
      step.choices.forEach(ch=>{
        const btn=document.createElement('button');
        btn.className='chat-btn'; btn.textContent=ch;
        btn.onclick=()=>{
          answers[step.id]=ch;
          addMessage(ch,'user');
          idx++; showStep();
        };
        inputPane.append(btn);
      });
    }
    else /* input */ {
      const txt=document.createElement('input');
      txt.className='chat-text';
      inputPane.append(txt);
      txt.focus();
      txt.addEventListener('keypress',e=>{
        if(e.key==='Enter'&&txt.value.trim()){
          answers[step.id]=txt.value.trim();
          addMessage(txt.value.trim(),'user');
          idx++; showStep();
        }
      });
    }
  }

  // —──────── INIT CHAT ─────────—
  addMessage("Welcome to Direct Freight Express!","bot",0);
  setTimeout(showStep,600);
});
