// Script para buscar el archivo en Moodle
async function d() { 
  for (let itemid of ['0', '1', '2', '3', '4']) {
    const form = new URLSearchParams(); 
    form.append('wstoken', '3e0ac0a51a5a48a54dade19d7935390c'); 
    form.append('wsfunction', 'core_files_get_files'); 
    form.append('moodlewsrestformat', 'json'); 
    form.append('contextid', '492'); 
    form.append('component', 'mod_customcert'); 
    form.append('filearea', 'issue'); 
    form.append('itemid', itemid); 
    form.append('filepath', '/'); // Requerido por Moodle
    form.append('filename', ''); // Vacío para buscar el directorio
    
    console.log(`Buscando con itemid ${itemid}...`);
    try {
      const r = await fetch('http://10.11.10.49/webservice/rest/server.php', { method: 'POST', body: form }); 
      const text = await r.json();
      if (text.files && text.files.length > 0) {
        console.log(`\n¡ENCONTRADO en itemid: ${itemid}!`);
        console.log(JSON.stringify(text, null, 2));
        return;
      }
    } catch (error) {}
  }
  console.log("No se encontraron archivos en la base de datos.");
} 
d();
