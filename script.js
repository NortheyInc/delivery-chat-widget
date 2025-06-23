const steps = [
  { id: 'delivery?', text: 'Are you looking for info on a delivery?', type: 'choice', choices: ['Yes', 'No'] },
  { id: 'role',    text: 'Are you the Sender or Receiver?',     type: 'choice', choices: ['Sender', 'Receiver'], dependsOn: 'Yes' },
  { id: 'postcode',text: 'Enter the Postcode:',                  type: 'input',  placeholder: '2000',              dependsOn: 'Yes' },
  { id: 'consign', text: 'Enter the Consignment Number:',        type: 'input',  placeholder: 'ABC123',           dependsOn: 'Yes' },
  { id: 'phone',   text: 'Enter your Phone Number:',             type: 'input',  placeholder: '0412345678',       dependsOn: 'Yes' },
  { id: 'surname', text: 'Enter your Surname:',                  type: 'input',  placeholder: 'Smith',            dependsOn: 'Yes' }
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

function showStep() {
  input.innerHTML = '';
  if (stepIndex >= steps.length) {
    addMessage('Thanks! Sending your info…', 'bot');
    console.log(answers); // for now, we just log answers
    return;
  }
  let step = steps[stepIndex];
  if (step.dependsOn && answers['delivery?'] !== step.dependsOn) {
    stepIndex++;
    return showStep();
  }
  addMessage(step.text, 'bot');
  if (step.type === 'choice') {
    step.choices.forEach(choice => {
      let btn = document.createElement('button');
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
    let txt = document.createElement('input');
    txt.className = 'chat-text';
    txt.placeholder = step.placeholder;
    txt.addEventListener('keypress', e => {
      if (e.key === 'Enter' && txt.value) {
        answers[step.id] = txt.value;
        addMessage(txt.value, 'user');
        stepIndex++;
        showStep();
      }
    });
    input.appendChild(txt);
    txt.focus();
  }
}

showStep();
