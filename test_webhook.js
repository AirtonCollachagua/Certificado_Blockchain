// Using native fetch available in Node.js 18+

const NGROK_URL = "https://tinctorial-nonheinously-youlanda.ngrok-free.dev";
const WEBHOOK_PATH = "/api/webhook/moodle";

const mockPayload = {
  eventname: "\\mod_customcert\\event\\issue_created",
  userid: "3",
  courseid: "3",
  objectid: 2,
  timecreated: Math.floor(Date.now() / 1000)
};

console.log("🚀 Iniciando Simulación de Moodle...");
console.log(`Enviando a: ${NGROK_URL}${WEBHOOK_PATH}`);

async function runTest() {
  try {
    const response = await fetch(`${NGROK_URL}${WEBHOOK_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" // Bypass ngrok warning page
      },
      body: JSON.stringify(mockPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`\n❌ Error del Servidor (${response.status}):`);
      console.log(text.substring(0, 500)); // Show first 500 chars
      return;
    }

    const data = await response.json();
    console.log("\n✅ Respuesta del Servidor:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log("\n🎉 ¡ÉXITO! El servidor recibió los datos y los registró en la Blockchain.");
      console.log(`Hash de transacción: ${data.data.txHash}`);
    }
  } catch (error) {
    console.error("\n❌ Error en la conexión:");
    console.log(error.message);
  }
}

runTest();
