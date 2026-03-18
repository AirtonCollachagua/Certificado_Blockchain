import 'dotenv/config.js';

async function testCookies() {
  const loginUrl = 'http://10.11.10.49/login/index.php';
  console.log("Obteniendo cookies iniciales...");
  
  const getResponse = await fetch(loginUrl);
  const getCookies = getResponse.headers.getSetCookie ? getResponse.headers.getSetCookie() : [];
  const cookieHeader = getCookies.map(c => c.split(';')[0]).join('; ');
  
  const html = await getResponse.text();
  const tokenMatch = html.match(/name="logintoken" value="([^"]+)"/);
  const logintoken = tokenMatch ? tokenMatch[1] : '';

  const form = new URLSearchParams();
  form.append('username', process.env.MOODLE_USER || '');
  form.append('password', process.env.MOODLE_PASS || '');
  form.append('logintoken', logintoken);

  const postResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'http://10.11.10.49',
      'Referer': loginUrl,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    },
    body: form.toString(),
    redirect: 'manual'
  });

  const loc = postResponse.headers.get('location');
  console.log(`\nLocation Redirect: ${loc}`);
  if (loc && loc.includes('testsession')) {
     console.log("¡Requiere verificación de Test Session Cookie!");
     
     // Yendo al redirect para completar el login
     const redirectCookies = postResponse.headers.getSetCookie ? postResponse.headers.getSetCookie() : [];
     const redirectCookieHeader = redirectCookies.map(c => c.split(';')[0]).join('; ') || cookieHeader;
     
     const verifyResponse = await fetch(loc, {
        headers: { 'Cookie': redirectCookieHeader },
        redirect: 'manual' 
     });
     console.log(`Verify Location: ${verifyResponse.headers.get('location')}`);
     
  } else if (loc && loc.includes('loginredirect')) {
     console.log("❌ LOGIN FALLIDO");
  } else {
     console.log("✅ LOGIN ACEPTADO");
  }
}

testCookies();
