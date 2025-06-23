document.addEventListener('DOMContentLoaded', () => {
  // —──────── DELIVERY DATA & STEPS ─────────—
  const deliveryData = [
    { CONSIGNMENT:"9999912345678", ETA:"23/06/2025", "RECEIVER NAME":"Northey", POSTCODE:"4221", "RECEIVER PHONE":"0403642769" },
    { CONSIGNMENT:"1111198765432", ETA:"23/06/2025", "RECEIVER NAME":"Catania", POSTCODE:"2142", "RECEIVER PHONE":"0297218106" },
    { CONSIGNMENT:"2222212345678", ETA:"24/06/2025", "RECEIVER NAME":"Cipolla", POSTCODE:"2028", "RECEIVER PHONE":"0492847511" },
    { CONSIGNMENT:"6666698765432", ETA:"24/06/2025", "RECEIVER NAME":"Smith",   POSTCODE:"2000", "RECEIVER PHONE":"0404498449" }
  ];
  const steps = [
    { id:'topic',    text:'Hello! How may I assist you today? 😊', type:'smartChoice', choices:['Track Consignment','Pickups','Sales'] },
    { id:'role',     text:'Are you the Sender or Receiver, please?', type:'choice',      choices:['Sender','Receiver'], dependsOn:'Track Consignment' },
    { id:'postcode', text:'Please enter the Postcode:',            type:'input',       dependsOn:'Track Consignment' },
    { id:'consign',  text:'Please enter the Consignment Number:', type:'input',       dependsOn:'Track Consignment' },
    { id:'phone',    text:'Please enter your Phone Number:',      type:'input',       dependsOn:'Track Consignment' },
    { id:'surname',  text:'Please enter your Surname:',           type:'input',       dependsOn:'Track Consignment' }
  ];

  // —──────── ELEMENTS & STATE ─────────—
  const body      = document.getElementById('chat-body');
  const inputPane = document.getElementById('chat-input');
  let answers = {}, idx = 0, channel;

  // —──────── UTILITIES ─────────—
  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }
  function addMessage(txt, who='bot', delay=600) {
    setTimeout(() => {
      const m = document.createElement('div');
      m.className = `msg ${who}`;
      m.innerHTML = txt.replace(/\n/g,'<br>');
      body.appendChild(m);
      scrollToBottom();
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
  function isWeekend(){ return [0,6].includes(new Date().getDay()); }
  function makeId(){ return Math.random().toString(36).slice(2,10); }

  // —──────── LIVE AGENT MODE ─────────—
  const params = new URLSearchParams(location.search);
  const isAgent = params.get('agent')==='true';
  const session = params.get('session');
  if(isAgent && session) {
    document.getElementById('chat-title').textContent = 'Agent Console';
    channel = new BroadcastChannel('dfe-chat-'+session);
    addMessage(`🔗 Connected to session ${session}`, 'agent', 0);
    const txtA = document.createElement('input');
    const btnA = document.createElement('button');
    txtA.className='chat-text'; txtA.placeholder='Type your message…';
    btnA.className='chat-btn';   btnA.textContent='Send';
    inputPane.append(txtA,btnA);
    btnA.onclick = ()=>{ 
      const t=txtA.value.trim(); if(!t) return;
      addMessage(t,'agent',0);
      channel.postMessage({sender:'agent',text:t});
      txtA.value='';
    };
    txtA.addEventListener('keypress',e=>{ if(e.key==='Enter') btnA.click(); });
    channel.onmessage = e=> addMessage(e.data.text,e.data.sender==='agent'?'agent':'user',0);
    return;
  }

  // —──────── CUSTOMER FLOW & Handoff Consent ─────────—
  channel = session ? new BroadcastChannel('dfe-chat-'+session) : null;

  function startAgentHandoff() {
    if(isWeekend()) {
      addMessage("I’m sorry, live chat isn’t available on weekends. A representative will follow up promptly. 🙏", 'bot');
      return;
    }
    const sid = makeId();
    const link = `${location.origin+location.pathname}?agent=true&session=${sid}`;
    // email to agent
    fetch('https://formsubmit.co/ajax/peterno@directfreight.com.au', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({
        subject:'Live Chat Request',
        message:`Session: ${sid}\nJoin as agent: ${link}`
      })
    });
    channel = new BroadcastChannel('dfe-chat-'+sid);
    addMessage("Thank you. A representative will join shortly…", 'bot');
    inputPane.innerHTML='';
    const txtC=document.createElement('input');
    const btnC=document.createElement('button');
    txtC.className='chat-text'; txtC.placeholder='Type your message…';
    btnC.className='chat-btn'; btnC.textContent='Send';
    inputPane.append(txtC,btnC);
    btnC.onclick = ()=>{
      const t=txtC.value.trim(); if(!t) return;
      addMessage(t,'user',0);
      channel.postMessage({sender:'user',text:t});
      txtC.value='';
    };
    txtC.addEventListener('keypress',e=>{ if(e.key==='Enter') btnC.click(); });
    channel.onmessage = e=> addMessage(e.data.text,'agent',0);
  }

  function askLiveAgentConsent() {
    addMessage("I’m sorry, I couldn’t verify your details. Would you like to talk to a live customer service representative? Please reply Yes or No.", 'bot');
    inputPane.innerHTML='';
    ['Yes','No'].forEach(label=>{
      const b=document.createElement('button');
      b.className='chat-btn'; b.textContent=label;
      b.onclick=()=>{
        addMessage(label,'user');
        if(label==='Yes') startAgentHandoff();
        else addMessage("No problem. Please let me know how else I may assist you. 😊", 'bot');
      };
      inputPane.append(b);
    });
  }

  // —──────── DIALOG FLOW ─────────—
  function showStep() {
    inputPane.innerHTML='';
    if(idx>=steps.length) {
      if(answers.topic!=='Track Consignment') {
        addMessage("Certainly, connecting you now…", 'bot');
        return askLiveAgentConsent();
      }
      // verify details
      const m = deliveryData.find(r=>
        normalize(r.POSTCODE)===normalize(answers.postcode) &&
        normalize(r.CONSIGNMENT)===normalize(answers.consign) &&
        normalize(r['RECEIVER PHONE'])===normalize(answers.phone) &&
        normalize(r['RECEIVER NAME'])===normalize(answers.surname)
      );
      if(!m) return askLiveAgentConsent();
      // matched
      addMessage("Thank you. We have matched your information.", 'bot');
      addMessage("How may I assist you further?", 'bot');
      return;
    }

    const step=steps[idx];
    if(step.dependsOn && answers.topic!==step.dependsOn) {
      idx++; return showStep();
    }

    addMessage(step.text,'bot');
    if(step.type==='smartChoice') {
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
      scrollToBottom();
      const wrap=document.createElement('div');
      const txt=document.createElement('input');
      txt.className='chat-text'; txt.placeholder='Or type…';
      wrap.append(txt); body.append(wrap); scrollToBottom();
      txt.focus();
      txt.addEventListener('keypress',e=>{
        if(e.key==='Enter'&&txt.value.trim()){
          const u=txt.value.trim();
          addMessage(u,'user');
          wrap.remove();
          const intent=matchIntent(u);
          if(intent) {
            inputPane.innerHTML='';
            addMessage(`Please confirm: ${intent}?`, 'bot');
            ['Yes','No'].forEach(lbl=>{
              const b=document.createElement('button');
              b.className='chat-btn'; b.textContent=lbl;
              b.onclick=()=>{
                addMessage(lbl,'user');
                if(lbl==='Yes'){ answers[step.id]=intent; idx++ }
                else addMessage("Alright, please choose again or rephrase. 😊",'bot');
                showStep();
              };
              inputPane.append(b);
            });
          } else askLiveAgentConsent();
        }
      });
    }
    else if(step.type==='choice') {
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
    else {
      const txt=document.createElement('input');
      txt.className='chat-text';
      inputPane.append(txt); txt.focus();
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
  addMessage("Welcome to Direct Freight Express! This chat is monitored for accuracy & reporting purposes. 🙏", 'bot', 0);
  setTimeout(showStep, 800);
});
