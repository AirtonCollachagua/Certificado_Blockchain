const fetch = require('node-fetch');

async function testLogin(username, password) {
  const loginUrl = 'http://10.11.10.49/login/index.php';
  
  // 1. Get the login page to extract the logintoken
  console.log("1. Obteniendo página de login...");
  const getResponse = await fetch(loginUrl);
  const getCookies = getResponse.headers.raw()['set-cookie'] || [];
  let moodleSession = getCookies.find(c => c.startsWith('MoodleSession='));
  if (moodleSession) moodleSession = moodleSession.split(';')[0];
  
  const html = await getResponse.text();
  const tokenMatch = html.match(/name="logintoken" value="([^"]+)"/);
  const logintoken = tokenMatch ? tokenMatch[1] : '';
  
  console.log(`Token de login encontrado: ${logintoken}`);
  console.log(`MoodleSession inicial: ${moodleSession}`);

  if (!logintoken) return;

  // 2. Perform the POST login
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  form.append('logintoken', logintoken);

  console.log("2. Enviando credenciales...");
  const postResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Cookie': moodleSession,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString(),
    redirect: 'manual' // Queremos ver a dónde nos manda el login
  });

  const postCookies = postResponse.headers.raw()['set-cookie'] || [];
  let finalMoodleSession = postCookies.find(c => c.startsWith('MoodleSession=')) || moodleSession;
  if (finalMoodleSession) finalMoodleSession = finalMoodleSession.split(';')[0];

  console.log(`MoodleSession final: ${finalMoodleSession}`);
  console.log(`Status de respuesta (debe ser 303 Redirect): ${postResponse.status}`);
  
  if (postResponse.status === 303) {
    console.log("✅ Inicio de sesión exitoso. Ahora intentamos descargar el certificado...");
    
    // 3. Try to download the certificate using the cookie
    const downloadUrl = 'http://10.11.10.49/mod/customcert/pluginfile.php/download.php?issueid=4';
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        'Cookie': finalMoodleSession
      }
    });
    
    console.log(`Status descarga: ${downloadResponse.status}`);
    console.log(`Tipo de archivo: ${downloadResponse.headers.get('content-type')}`);
    
    if (downloadResponse.ok) {
       console.log("🎉 PDF DESCARGADO CORRECTAMENTE!");
    }
  } else {
    console.log("❌ Falló el inicio de sesión");
  }
}

// Sustituye por un usuario/pass de admin o profe de tu moodle para la prueba locally
// testLogin('admin', 'password');
