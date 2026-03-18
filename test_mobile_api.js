import 'dotenv/config.js';

async function testMobileDownload() {
  const token = '3e0ac0a51a5a48a54dade19d7935390c';
  const cmid = '293';
  const userid = '3';
  
  const url = `http://10.11.10.49/mod/customcert/mobile/pluginfile.php?token=${token}&certificateid=${cmid}&userid=${userid}`;
  console.log(`Pidiendo archivo al Endpoint Mobile oficial: ${url}`);
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`Status HTTP: ${response.status}`);
    console.log(`Tamaño: ${text.length} bytes`);
    
    if (text.startsWith('%PDF-')) {
       console.log("✅ ¡ES UN PDF PERFECTO!");
    } else {
       console.log("❌ Sigue siendo texto/HTML. Contenido:");
       console.log(text.substring(0, 500));
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

testMobileDownload();
