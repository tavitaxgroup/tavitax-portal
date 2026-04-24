const http = require('http');

async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'acc@tavitax.com', password: 'Tavitax123@' })
  });
  const cookie = res.headers.get('set-cookie');
  
  if (cookie) {
    const res4 = await fetch('http://localhost:3000/api/portal/documents', {
      headers: { cookie: cookie }
    });
    console.log('Docs status:', res4.status);
    const data4 = await res4.json();
    console.log('Docs:', data4);
  }
}
test();
