// Script para autologin
async function testAutoLogin() { 
  const form = new URLSearchParams(); 
  form.append('wstoken', '3e0ac0a51a5a48a54dade19d7935390c'); 
  form.append('wsfunction', 'tool_mobile_get_autologin_key'); 
  form.append('moodlewsrestformat', 'json'); 
  
  console.log("Probando generador de llaves de Auto-Login...");
  try {
    const r = await fetch('http://10.11.10.49/webservice/rest/server.php', { method: 'POST', body: form }); 
    const text = await r.text();
    console.log("\nRespuesta:");
    console.log(text);
  } catch (error) {
    console.log("Error de conexión");
  }
} 
testAutoLogin();
