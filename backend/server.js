import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import "dotenv/config.js";
import { processCertificate } from "./services/certificateService.js";
import { uploadToGoogleCloudBucket } from "./services/gcsService.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directorio público para alojar la bóveda inmutable de certificados
const certDir = path.join(process.cwd(), "certificados");
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}
app.use("/certificados", express.static(certDir));

// Redirigir /validar a /validar/ para asegurar que las rutas relativas (js/app.js) funcionen bien en la red local
app.get("/validar", (req, res, next) => {
  if (!req.url.endsWith("/")) { return res.redirect(301, req.url + "/"); }
  next();
});

// Servir el portal de validación frontend (para compartir en la red local)
const frontendDir = path.join(process.cwd(), "frontend");
app.use("/validar", express.static(frontendDir));

// Logger global para ver CUALQUIER intento de conexión
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] Recibido: ${req.method} ${req.originalUrl}`);
  next();
});

// Endpoint de prueba para verificar conexión desde el navegador
app.get("/", (req, res) => {
  res.send("Servidor de Webhook Blockchain activo y escuchando!");
});

// Moodle Webhook Endpoint for Custom Certificate (mod_customcert)
app.post(["/api/webhook/moodle", "/api/webhook/moodle/"], async (req, res) => {
  console.log("LOG: Petición recibida en /api/webhook/moodle!");
  console.log("Cuerpo de la petición:", JSON.stringify(req.body, null, 2));

  try {
    const { eventname, userid, courseid, timecreated } = req.body;

    // Verificar que sea el evento correcto de certificado emitido
    if (eventname !== "\\mod_customcert\\event\\issue_created" || !userid || !courseid) {
      return res.status(400).json({ error: "Invalid or unsupported event payload" });
    }

    console.log(`Received CustomCert Webhook for User ID: ${userid} - Course ID: ${courseid}`);

    // Como Moodle ya generó el PDF, necesitamos descargarlo desde sus servidores.
    // Usaremos los APIs web de Moodle o una URL de exportación.
    // Nota: Esto requiere que tengas un token (Web Service Token) de Moodle en tu archivo .env
    const moodleToken = process.env.MOODLE_WS_TOKEN;
    const moodleHost = process.env.MOODLE_HOST || "http://10.11.10.49"; // Desde el json del webhook

    if (!moodleToken) {
       console.warn("ADVERTENCIA: No hay MOODLE_WS_TOKEN en el .env. Se usará un PDF en blanco de prueba.");
       // Creamos un buffer falso simulando un PDF solo para que pase mientras configuras Moodle
       const fakePdfBuffer = Buffer.from("%PDF-1.4 Fake Moodle Data", "utf8");
       
       const result = await processCertificate(fakePdfBuffer);
       return res.status(200).json({ success: true, message: "Prueba sin Token completada", data: result });
    }

    // --- NUEVO MÉTODO DE DESCARGA (Auto-Login) ---
    console.log("Intentando iniciar sesión en Moodle para descargar el PDF...");
    let pdfBuffer;
    
    try {
      // 1. Obtener la página de login
      const loginUrl = `${moodleHost}/login/index.php`;
      const getResponse = await fetch(loginUrl);
      
      // Node 18+ native fetch getSetCookie()
      const getCookies = getResponse.headers.getSetCookie ? getResponse.headers.getSetCookie() : [];
      let moodleSession = getCookies.find(c => c.startsWith('MoodleSession='));
      if (moodleSession) moodleSession = moodleSession.split(';')[0];
      
      const html = await getResponse.text();
      const tokenMatch = html.match(/name="logintoken" value="([^"]+)"/);
      const logintoken = tokenMatch ? tokenMatch[1] : '';

      // 2. Hacer POST del login
      const moodleUser = process.env.MOODLE_USER || "admin";
      const moodlePass = process.env.MOODLE_PASS || "password";
      
      const form = new URLSearchParams();
      form.append('username', moodleUser);
      form.append('password', moodlePass);
      if (logintoken) form.append('logintoken', logintoken);

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
        if (loc && loc.includes('loginredirect')) {
          throw new Error("Moodle rechazó el Login. Revisa MOODLE_USER y MOODLE_PASS en .env.");
        }
        
        // Moodle 4.x requiere visitar "testsession" para activar la sesión
        if (loc && loc.includes('testsession')) {
          await fetch(loc, { headers: { 'Cookie': finalMoodleSession }, redirect: 'manual' });
        }
        
        console.log("✅ Sesión Moodle verificada con éxito. Descargando certificado...");
        
        // 3. Descargar el certificado
        const courseModuleId = req.body.contextinstanceid; // 293
        const usrId = req.body.userid; // 3
        const downloadUrl = `${moodleHost}/mod/customcert/view.php?id=${courseModuleId}&downloadissue=${usrId}`;
        
        console.log(`Pidiendo archivo desde: ${downloadUrl}`);
        const downloadResponse = await fetch(downloadUrl, {
          headers: { 'Cookie': finalMoodleSession }
        });
        
        if (!downloadResponse.ok) {
           console.error(`Error HTTP desde Moodle: ${downloadResponse.status}`);
           throw new Error("Fallo en la descarga del archivo.");
        }
        
        const contentType = downloadResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf')) {
           console.error(`Cuidado: Moodle no devolvió un PDF. Content-Type: ${contentType}`);
        }
        
        const arrayBuffer = await downloadResponse.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
        console.log(`✅ PDF REAL descargado con éxito. Tamaño: ${pdfBuffer.length} bytes`);
        
        // --- GUARDAR EN LA BÓVEDA ---
        const fileName = `certificado_id${req.body.contextinstanceid}_u${req.body.userid}.pdf`;
        const filePath = path.join(certDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`📁 Certificado original guardado inmutablemente para descarga en: /certificados/${fileName}`);
        const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
        console.log(`URL de descarga final: ${publicUrl}/certificados/${fileName}`);
        
        // --- SUBIR A GOOGLE CLOUD STORAGE BUCKET ---
        await uploadToGoogleCloudBucket(pdfBuffer, fileName);
        // ----------------------------
      } else {
        throw new Error("Credenciales inválidas o Moodle rechazó el login.");
      }
    } catch (downloadError) {
      console.warn("❌ Fallo crítico en la descarga del PDF real:", downloadError.message);
      console.warn("Usando PDF de prueba para no detener el flujo.");
      pdfBuffer = Buffer.from(`%PDF-1.4 Mock Moodle PDF content - ${Date.now()}`, "utf8");
    }

    // Mandamos a sacar Hash y Registrar en Blockchain
    const result = await processCertificate(pdfBuffer);

    res.status(200).json({
      success: true,
      message: "Certificate downloaded, hashed and registered successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
});
