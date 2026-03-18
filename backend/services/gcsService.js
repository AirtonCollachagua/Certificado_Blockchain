import { Storage } from '@google-cloud/storage';
import 'dotenv/config.js';

export async function uploadToGoogleCloudBucket(pdfBuffer, fileName) {
    try {
        const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json';
        const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

        if (!bucketName) {
            console.log("⚠️ GOOGLE_CLOUD_BUCKET_NAME no configurado en .env. Saltando subida al Bucket de Google Cloud.");
            return null;
        }

        // Instanciar el cliente de Storage de Google usando nuestro JSON de validación.
        const storage = new Storage({
            keyFilename: credentialsFile,
        });

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);

        console.log(`☁️  Subiendo ${fileName} al Bucket de Google Cloud (${bucketName})...`);
        
        // Subir directamente el Buffer a la nube
        await file.save(pdfBuffer, {
            contentType: 'application/pdf',
            metadata: {
                cacheControl: 'public, max-age=31536000', // Cache por 1 año
            }
        });

        // Al usar Control de Acceso Uniforme, el bucket entero debe configurarse
        // como público desde la consola (allUsers -> Storage Object Viewer).
        // No podemos usar file.makePublic() por código.
        
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        
        console.log(`✅ Archivo subido maravillosamente al Bucket!`);
        console.log(`🔗 Link de Descarga GCS: ${publicUrl}`);
        
        return {
             id: fileName,
             downloadLink: publicUrl
        };

    } catch (error) {
        console.error("❌ Error grave al subir a Google Cloud Bucket:", error.message);
        console.error("-> ¿Agregaste los permisos (Storage Object Admin) correctos al correo en IAM o te equivocaste en el nombre del Bucket?");
        return null; // Retornamos null para no romper Node.js
    }
}
