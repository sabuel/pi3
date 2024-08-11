function showForm() {
    const role = document.getElementById('role').value;
    document.getElementById('cliente-form').classList.add('hidden');
    document.getElementById('vendedor-form').classList.add('hidden');
  
    if (role === 'cliente') {
      document.getElementById('cliente-form').classList.remove('hidden');
    } else {
      document.getElementById('vendedor-form').classList.remove('hidden');
    }
  }
  
  function submitForm(event, role) {
    event.preventDefault();
    const form = role === 'cliente' ? document.getElementById('cliente-form') : document.getElementById('vendedor-form');
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
  
    fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role, data })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message);
      form.reset();
      document.getElementById('select-role-form').reset();
      document.getElementById('cliente-form').classList.add('hidden');
      document.getElementById('vendedor-form').classList.add('hidden');
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }
  