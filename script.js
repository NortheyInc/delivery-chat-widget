document.addEventListener('DOMContentLoaded', () => {
  // 1. Load your Excel data
  let tableData = [];
  fetch('data.xlsx')
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      tableData = XLSX.utils.sheet_to_json(sheet);
      console.log('Data loaded:', tableData);
    })
    .catch(err => console.error('Error loading spreadsheet:', err));

  // 2. Define the Q&A flow
  const steps = [
    { id: 'delivery?', text: 'Are you looking for info on a delivery?', type: 'choice', choices: ['Yes', 'No'] },
    { id: 'role',     text: 'Are you the Sender or Receiver?',     type: 'choice', choices: ['Sender', 'Receiver'], dependsOn: 'Yes' },
    { id: 'postcode', text: 'Enter the Postcode:',                  type: 'input',  placeholder: '2000',      dependsOn: 'Yes' },
    { id: 'consign',  text: 'Enter the Consignment Number:',        type: 'input',  placeholder: 'ABC123',   dependsOn: 'Yes' },
    { id: 'phone',    text: 'Enter your Phone Number:',             type: 'input',  placeholder: '0412345678',dependsOn: 'Yes' },
    { id: 'surname',  text: 'Enter your Surname:',                  type: 'input',  placeholder: 'Smith',    dependsOn: 'Yes' }
  ];

  let answers = {};
  let stepIndex = 0;

  const body = document.getElementById('chat-body');
  const input = document.getElementById('chat-input');

  // Helper: add a message bubble
  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = 'msg ' + who;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  // Helper: hand off to live chat
  function startLiveChat() {
    addMessage('Connecting you to a live agent…', 'bot');
    // Replace with your actual live-chat URL or function
    window.open('https://your-livechat.example.com', '_blank');
  }

  // Main: show each step
  function showStep() {
    input.innerHTML = '';

    // Finished all steps → lookup
    if (stepIndex >= steps.length) {
      addMessage('Thanks! Finding your delivery status…', 'bot');

      // Lookup in tableData
      const match = tableData.find(row =>
        String(row.Postcode) === answers.postcode &&
        String(row.Consignment) === answers.consign
      );

      if (match) {
        addMessage(`Status: ${match.Status}`, 'bot');
        addMessage(`ETA: ${match.ETA}`, 'bot');
      } else {
        addMessage('Sorry, we couldn’t find that delivery. Double-check your Postcode & Consignment.', 'bot');
      }

      // Then ask if they’re happy
      addMessage('Did this answer help you?', 'bot');
      ['Yes','No'].forEach(choice => {
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

    // Otherwise, get current step
    const step = steps[stepIndex];
    if (step.dependsOn && answers['delivery?'] !== step.dependsOn) {
      stepIndex++;
      return showStep();
    }

    // Ask the question
    addMessage(step.text, 'bot');

    if (step.type === 'choice') {
      // Show buttons
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
      // Show text input
      const txt = document.createElement('input');
      txt.className = 'chat-text';
      txt.placeholder = step.placeholder;
      txt.addEventListener('keypress', e => {
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

  // Start the conversation
  showStep();
});
