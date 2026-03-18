import fs from 'fs';
import crypto from 'crypto';
import 'dotenv/config.js';

async function testDownloadHash() {
  const loginUrl = 'http://10.11.10.49/login/index.php';
  
  const getResponse = await fetch(loginUrl);
  const getCookies = getResponse.headers.getSetCookie ? getResponse.headers.getSetCookie() : [];
  let moodleSession = getCookies.find(c => c.startsWith('MoodleSession='));
  if (moodleSession) moodleSession = moodleSession.split(';')[0];
  
  const html = await getResponse.text();
  const tokenMatch = html.match(/name="logintoken" value="([^"]+)"/);
  const logintoken = tokenMatch ? tokenMatch[1] : '';

  const form = new URLSearchParams();
  form.append('username', process.env.MOODLE_USER || 'admin');
  form.append('password', process.env.MOODLE_PASS || 'password');
  form.append('logintoken', logintoken);

  const postResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Cookie': moodleSession,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString(),
    redirect: 'manual'
  });

  const postCookies = postResponse.headers.getSetCookie ? postResponse.headers.getSetCookie() : [];
  let finalMoodleSession = postCookies.find(c => c.startsWith('MoodleSession=')) || moodleSession;
  if (finalMoodleSession) finalMoodleSession = finalMoodleSession.split(';')[0];

  if (postResponse.status === 303) {
    const loc = postResponse.headers.get('location');
    if (loc && loc.includes('testsession')) {
       await fetch(loc, { headers: { 'Cookie': finalMoodleSession }, redirect: 'manual' });
    }
    
    // 3. Descargar el certificado
    const viewUrl = 'http://10.11.10.49/mod/customcert/view.php?id=293&downloadissue=3';
    
    const downloadResponse = await fetch(viewUrl, { headers: { 'Cookie': finalMoodleSession }});
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync('certificado_backend.pdf', pdfBuffer);
    
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
    console.log(`✅ PDF guardado como certificado_backend.pdf`);
    console.log(`Tamaño: ${pdfBuffer.length} bytes`);
    console.log(`Hash SHA-256 Calculado por Backend: 0x${hash}`);
  }
}

testDownloadHash();
