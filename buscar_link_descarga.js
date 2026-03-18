import 'dotenv/config.js';

async function testLoginReal() {
  const loginUrl = 'http://10.11.10.49/login/index.php';
  
  const headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
  };

  const getResponse = await fetch(loginUrl, { headers });
  const getCookies = getResponse.headers.getSetCookie ? getResponse.headers.getSetCookie() : [];
  let moodleSession = getCookies.find(c => c.startsWith('MoodleSession='));
  if (moodleSession) moodleSession = moodleSession.split(';')[0];
  
  const html = await getResponse.text();
  const tokenMatch = html.match(/name="logintoken" value="([^"]+)"/);
  const logintoken = tokenMatch ? tokenMatch[1] : '';

  console.log(`Intentando Login con Usuario: ${process.env.MOODLE_USER}`);
  console.log(`Tenemos Token?: ${!!logintoken}`);
  
  const form = new URLSearchParams();
  form.append('username', process.env.MOODLE_USER || '');
  form.append('password', process.env.MOODLE_PASS || '');
  form.append('logintoken', logintoken);

  const postResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Cookie': moodleSession,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString(),
    redirect: 'manual'
  });

  const loc = postResponse.headers.get('location');
  console.log("Moodle nos redirige a:", loc);
  
  if (loc && loc.includes('loginredirect=1')) {
    console.log("❌ LOGIN RECHAZADO: Credenciales inválidas o seguridad de Moodle!");
  } else if (loc && loc.includes('testsession')) {
    console.log("⚠️ Requiere Test Session Cookie!");
  } else {
    console.log("✅ LOGIN ACEPTADO!");
  }
}

testLoginReal();
