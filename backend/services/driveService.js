import { google } from 'googleapis';
import stream from 'stream';
import 'dotenv/config.js';

export async function uploadToGoogleDrive(pdfBuffer, fileName) {
    try {
        const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json';
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!folderId) {
            console.log("⚠️ GOOGLE_DRIVE_FOLDER_ID no configurado en .env. Saltando subida a Drive.");
            return null;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsFile,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        const drive = google.drive({ version: 'v3', auth });

        // Convertir el Buffer del PDF a un Readable Stream que la API de Google Drive acepta
        const bufferStream = new stream.PassThrough();
        bufferStream.end(pdfBuffer);

        console.log(`☁️  Subiendo ${fileName} a Google Drive (Carpeta: ${folderId})...`);
        
        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };
        const media = {
            mimeType: 'application/pdf',
            body: bufferStream
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        });

        const fileId = file.data.id;
        
        // Hacer el archivo público para que cualquiera con el enlace (Moodle) pueda verlo/descargarlo
        console.log(`🔒 Haciendo público el archivo ${fileId} en Drive...`);
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        console.log(`✅ Archivo subido exitosamente a Google Drive!`);
        console.log(`🔗 Link de Drive (Para Moodle): ${file.data.webViewLink}`);
        
        return {
             id: fileId,
             viewLink: file.data.webViewLink,
             downloadLink: file.data.webContentLink
        };

    } catch (error) {
        console.error("❌ Error grave al subir a Google Drive:", error.message);
        console.error("-> ¿Agregaste el correo del Service Account como Editor en tu carpeta de Drive?");
        return null; // Retornamos null para que no tire el servidor principal si Drive falla
    }
}
