const http = require('http');

async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'acc@tavitax.com', password: 'Tavitax123@' })
  });
  const data = await res.json();
  console.log('Login:', data);

  const cookie = res.headers.get('set-cookie');
  console.log('Cookie:', cookie);

  if (cookie) {
    const res2 = await fetch('http://localhost:3000/api/portal/users', {
      headers: { cookie: cookie }
    });
    console.log('Users status:', res2.status);
    const data2 = await res2.json();
    console.log('Users:', data2);
    
    const res3 = await fetch('http://localhost:3000/api/portal/crm', {
      headers: { cookie: cookie }
    });
    console.log('CRM status:', res3.status);
    const data3 = await res3.json();
    console.log('CRM length:', data3.length);
  }
}
test();
