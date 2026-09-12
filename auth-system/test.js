const http = require('http');

function request(path, method, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-forwarded-for': '127.0.0.1' // for rate limiting
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("--- Testing Idempotency ---");
  const signupData = { name: 'Test User', email: 'test@example.com', password: 'Password123!' };
  const res1 = await request('/api/auth/signup', 'POST', signupData);
  console.log('Signup 1:', res1.status, res1.body);
  
  const res2 = await request('/api/auth/signup', 'POST', signupData);
  console.log('Signup 2:', res2.status, res2.body);

  console.log("\n--- Testing Rate Limiting (Forgot Password) ---");
  for (let i = 1; i <= 6; i++) {
    const res = await request('/api/auth/forgot-password', 'POST', { email: 'test@example.com' });
    console.log(`Request ${i}:`, res.status, res.body);
    if (res.status === 429) break;
  }
}

runTests();
