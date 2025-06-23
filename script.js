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
  const STATE = { answers:{}, idx:0, channel:null, body:null, inputPane:null };

  // —──────── UTILITIES ─────────—
  function scrollToBottom(){
    STATE.body.scrollTop = STATE.body.scrollHeight;
  }
  function normalize(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,''); }
  function matchIntent(t){
    const u = normalize(t);
    if(/track|delivery|where/.test(u)) return 'Track Consignment';
    if(/pickup|collect/.test(u))          return 'Pickups';
    if(/quote|price|sales/.test(u))       return 'Sales';
    return null;
  }
  function isWeekend(){ return [0,6].includes(new Date().getDay()); }
  function makeId(){ return Math.random().toString(36).slice(2,10); }

  // —──────── MESSAGE RENDERER ─────────—
  function addMessage(txt, who='bot', baseDelay=800){
    const humanDelay = baseDelay + 400 + Math.random()*800;
    setTimeout(()=>{
      const m = document.createElement('div');
      m.className = `msg ${who}`;
      m.setAttribute('role','article');
      m.setAttribute('aria-live','polite');
      const avatar = document.createElement('div');
      avatar.className = `avatar ${who}`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = txt.replace(/\n/g,'<br>');
      m.append(avatar, bubble);
      STATE.body.appendChild(m);
      scrollToBottom();
    }, humanDelay);
  }

  // —──────── VALIDATORS ─────────—
  function validatePostcode(s){ return /^\d{4}$/.test(s); }
  function validatePhone(s){ return /^0[23478]\d{8}$/.test(s); }
  function validateConsignment(s){ return /^\d{13}$/.test(s); }

  // —──────── RENDER HELPERS ─────────—
  function renderSmartChoice(step){
    addMessage(step.text,'bot');
    STATE.inputPane.innerHTML='';
    const cdiv = document.createElement('div');
    cdiv.className='choice-container';
    step.choices.forEach(ch=>{
      const btn = document.createElement('button');
      btn.className='chat-btn'; btn.textContent=ch;
      btn.onclick=()=>{
        STATE.answers[step.id]=ch;
        addMessage(ch,'user');
        STATE.idx++; showStep();
      };
      cdiv.append(btn);
    });
    const wrap = document.createElement('div');
    const txt = document.createElement('input');
    txt.className='chat-text'; txt.placeholder='Or type…';
    wrap.append(txt);
    STATE.body.append(cdiv, wrap);
    txt.focus();
    txt.addEventListener('keypress',e=>{
      if(e.key==='Enter'&&txt.value.trim()){
        const u=txt.value.trim();
        addMessage(u,'user');
        wrap.remove();
        const intent=matchIntent(u);
        if(intent) confirmIntent(intent);
        else askLiveAgentConsent();
      }
    });
  }

  function renderChoice(step){
    addMessage(step.text,'bot');
    STATE.inputPane.innerHTML='';
    step.choices.forEach(ch=>{
      const btn=document.createElement('button');
      btn.className='chat-btn'; btn.textContent=ch;
      btn.onclick=()=>{
        STATE.answers[step.id]=ch;
        addMessage(ch,'user');
        STATE.idx++; showStep();
      };
      STATE.inputPane.append(btn);
    });
  }

  function renderInput(step){
    addMessage(step.text,'bot');
    STATE.inputPane.innerHTML='';
    const txt=document.createElement('input');
    txt.className='chat-text'; STATE.inputPane.append(txt);
    txt.focus();
    txt.addEventListener('keypress',e=>{
      if(e.key==='Enter'&&txt.value.trim()){
        const v=txt.value.trim();
        let valid=true,err='';
        if(step.id==='postcode'&&!validatePostcode(v)){
          valid=false; err='Postcode must be 4 digits.';
        }
        if(step.id==='phone'&&!validatePhone(v)){
          valid=false; err='Phone must be 10 digits, start 02/03/04/07/08.';
        }
        if(step.id==='consign'&&!validateConsignment(v)){
          valid=false; err='Consignment no. must be 13 digits.';
        }
        if(!valid){
          const eDiv=document.createElement('div');
          eDiv.className='error'; eDiv.textContent=err;
          STATE.inputPane.append(eDiv);
          return;
        }
        STATE.answers[step.id]=v;
        addMessage(v,'user');
        if(step.id==='consign'){
          const rec=DELIVERY_DATA.find(r=>normalize(r.CONSIGNMENT)===normalize(v));
          if(!rec){
            return askLiveAgentConsent();
          }
        }
        STATE.idx++; showStep();
      }
    });
  }

  function confirmIntent(intent){
    STATE.inputPane.innerHTML='';
    addMessage(`Please confirm: ${intent}?`,'bot');
    ['Yes','No'].forEach(lbl=>{
      const b=document.createElement('button');
      b.className='chat-btn'; b.textContent=lbl;
      b.onclick=()=>{
        addMessage(lbl,'user');
        if(lbl==='Yes'){
          STATE.answers.topic=intent;
          STATE.idx++;
        } else {
          addMessage("Alright, please choose again or rephrase. 😊",'bot');
        }
        showStep();
      };
      STATE.inputPane.append(b);
    });
  }

  // —──────── POST-MATCH OPTIONS ─────────—
  function renderPostMatchOptions(match){
    STATE.inputPane.innerHTML='';
    const etaBtn=document.createElement('button');
    etaBtn.className='chat-btn'; etaBtn.textContent='ETA';
    etaBtn.onclick=()=>addMessage(`Your ETA is ${match.ETA}.`,'bot');

    const txt=document.createElement('input');
    txt.className='chat-text'; txt.placeholder='Type your question…';
    const send=document.createElement('button');
    send.className='chat-btn'; send.textContent='Send';
    send.onclick=()=>{
      const q=txt.value.trim();
      if(!q) return;
      addMessage(q,'user');
      addMessage("Thanks for your question! We'll get back to you shortly.",'bot');
      txt.value='';
    };
    txt.addEventListener('keypress',e=>{ if(e.key==='Enter')send.click(); });

    STATE.inputPane.append(etaBtn, txt, send);
    txt.focus();
  }

  // —──────── FINALIZATION & HANDOFF ─────────—
  function finalizeFlow(){
    if(STATE.answers.topic!=='Track Consignment'){
      addMessage("Certainly, connecting you now…",'bot');
      return askLiveAgentConsent();
    }
    const m=DELIVERY_DATA.find(r=>
      normalize(r.POSTCODE)===normalize(STATE.answers.postcode)&&
      normalize(r.CONSIGNMENT)===normalize(STATE.answers.consign)&&
      normalize(r['RECEIVER PHONE'])===normalize(STATE.answers.phone)&&
      normalize(r['RECEIVER NAME'])===normalize(STATE.answers.surname)
    );
    if(!m) return askLiveAgentConsent();
    addMessage("Thank you. We have matched your information.",'bot');
    addMessage("How may I assist you further?",'bot');
    renderPostMatchOptions(m);
  }

  function startAgentHandoff(){ /* unchanged… */ }
  function askLiveAgentConsent(){ /* unchanged… */ }

  // —──────── DIALOG FLOW ─────────—
  function showStep(){
    if(STATE.idx>=STEPS.length) return finalizeFlow();
    const step=STEPS[STATE.idx];
    if(step.dependsOn&&STATE.answers.topic!==step.dependsOn){
      STATE.idx++; return showStep();
    }
    switch(step.type){
      case 'smartChoice': renderSmartChoice(step); break;
      case 'choice':      renderChoice(step);       break;
      case 'input':       renderInput(step);        break;
    }
  }

  // —──────── BOOTSTRAP CHAT ─────────—
  document.addEventListener('DOMContentLoaded',()=>{
    STATE.body      = document.getElementById('chat-body');
    STATE.inputPane = document.getElementById('chat-input');

    // anchor input-pane at bottom, make body scroll above it
    STATE.inputPane.style.position = 'fixed';
    STATE.inputPane.style.bottom   = '0';
    STATE.inputPane.style.left     = '0';
    STATE.inputPane.style.width    = '100%';
    STATE.inputPane.style.backgroundColor = '#fff';
    STATE.body.style.paddingBottom = STATE.inputPane.offsetHeight + 'px';

    addMessage("Welcome to Direct Freight Express! This chat is monitored for accuracy & reporting purposes. 🙏",'bot',0);
    setTimeout(showStep, 1000);
  });
})();
