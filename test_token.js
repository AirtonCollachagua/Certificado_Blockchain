async function d() { 
  const form = new URLSearchParams(); 
  form.append('wstoken', '3e0ac0a51a5a48a54dade19d7935390c'); 
  form.append('wsfunction', 'core_webservice_get_site_info'); 
  form.append('moodlewsrestformat', 'json'); 
  
  console.log("Haciendo 'Ping' a Moodle para revisar el Token...");
  try {
    const response = await fetch('http://10.11.10.49/webservice/rest/server.php', { method: 'POST', body: form }); 
    const text = await response.json();
    console.log(JSON.stringify(text, null, 2));
  } catch (error) {
    console.error("Error crítico de red:", error);
  }
} 
d();
