document.addEventListener('DOMContentLoaded', function() {
  let tableData = [];
  fetch('data.xlsx')
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      tableData = XLSX.utils.sheet_to_json(sheet);
    });

  const steps = [
    { id: 'delivery?', text: 'Are you looking for info on a delivery?', type: 'choice', choices: ['Yes', 'No'] },
    { id: 'role',      text: 'Are you the Sender or Receiver?',         type: 'choice', choices: ['Sender', 'Receiver'], dependsOn: 'Yes' },
    { id: 'postcode',  text: 'Enter the Postcode:',                     type: 'input',  placeholder: '2000', dependsOn: 'Yes' },
    { id: 'consign',   text: 'Enter the Consignment Number:',           type: 'input',  placeholder: 'ABC123', dependsOn: 'Yes' },
    { id: 'phone',     text: 'Enter your Phone Number:',                type: 'input',  placeholder: '0412345678', dependsOn: 'Yes' },
    { id: 'surname',   text: 'Enter your Surname:',                     type: 'input',  placeholder: 'Smith', dependsOn: 'Yes' }
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

  function sendEmailNotification(data) {
    fetch('https://formsubmit.co/ajax/peterno@directfreight.com.au', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        message: 'User was not satisfied with chat bot',
        ...data
      })
    })
    .then(response => response.json())
    .then(data => console.log('Email sent:', data))
    .catch(error => console.error('Email failed:', error));
  }

  function startLiveChat() {
    addMessage('Connecting you to a live agent…', 'bot');
    sendEmailNotification(answers);
    window.open('https://your-livechat.example.com', '_blank'); // Replace with real URL
  }

  function showStep() {
    input.innerHTML = '';

    if (stepIndex >= steps.length) {
      addMessage('Thanks! Finding your delivery status…', 'bot');

      const match = tableData.find(row =>
        String(row.Postcode) === answers.postcode &&
        String(row.Consignment) === answers.consign
      );

      if (match) {
        addMessage('Status: ' + match.Status, 'bot');
        addMessage('ETA: ' + match.ETA, 'bot');
      } else {
        addMessage('Sorry, we couldn’t find that delivery.', 'bot');
      }

      addMessage('Did this answer help you?', 'bot');
      ['Yes', 'No'].forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'chat-btn';
        btn.textContent = choice;
        btn.onclick = () => {
          addMessage(choice, 'user');
          if (choice === 'No') {
            startLiveChat();
          } else {
            addMessage('Great—we’re happy to help!', 'bot');
          }
          input.innerHTML = '';
        };
        input.appendChild(btn);
      });
      return;
    }

    const step = steps[stepIndex];
    if (step.dependsOn && answers['delivery?'] !== step.dependsOn) {
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
      txt.placeholder = step.placeholder;
      txt.addEventListener('keypress', function(e) {
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

  // 🟠 Show welcome first
  addMessage(
    'Welcome to Direct Freight Express! Please be aware that this chat may be used for accuracy and reporting purposes.',
    'bot'
  );
  setTimeout(showStep, 1000);
});
