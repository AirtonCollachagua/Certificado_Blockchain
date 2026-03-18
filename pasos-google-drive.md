# Configuración de Google Drive para Almacenamiento Inmutable

Para que el servidor Node.js pueda subir los PDFs automáticamente a una carpeta de Google Drive corporativa, necesitas proporcionarle las llaves de acceso (Credenciales de Service Account). Sigue estos 5 pasos:

### Paso 1: Crear el Proyecto en Google Cloud
1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo (ej. `Certificados-Blockchain-Perupetro`).
3. Busca en la barra superior "Google Drive API" y dale clic a **Habilitar** (Enable).

### Paso 2: Crear el Service Account (El "Robot")
1. En el menú izquierdo de Google Cloud ve a **APIs & Services > Credentials**.
2. Arriba dale a **Create Credentials** y elige **Service Account**.
3. Ponle un nombre (ej. `moodle-bot`) y crea la cuenta.
4. Una vez creada, entra a la cuenta y verás que tiene un **Correo Electrónico** extraño (tipo `moodle-bot@proyecto...iam.gserviceaccount.com`). *¡Copia ese correo, lo necesitarás en el paso 4!*
5. Ve a la pestaña **Keys** > **Add Key** > **Create new key**. Elige formato **JSON**.
6. Se descargará un archivo en tu computadora. Ese archivo es la llave secreta.

### Paso 3: Configurar el Archivo JSON de Credenciales
1. Agarra el archivo JSON que acabas de descargar de Google.
2. Renómbralo a **`google-credentials.json`**.
3. Cópialo y pégalo exactamente **adentro de la carpeta raíz de tu proyecto** (aquí mismo junto al archivo `.env` y el `server.js`, en `C:\Blockchain\`).

### Paso 4: Dar Permiso a la Carpeta Elegida
1. Entra a tu Google Drive normal corporativo.
2. Crea la gran carpeta donde quieres que vivan todos los certificados (ej. `Bóveda Blockchain Certificados`).
3. Dale clic derecho a la carpeta > **Compartir**.
4. Pega el **Correo Electrónico del Service Account** (el que copiaste en el Paso 2) y dale permisos de **Editor**. ¡Esto le da derecho a nuestro Node.js para entrar a esa carpeta!

### Paso 5: Configurar el .env
1. Saca el "ID de la carpeta". Lo encuentras en la URL de tu navegador cuando estás adentro de la carpeta en Google Drive (es la ristra larga de letras y números al final de `https://drive.google.com/drive/folders/ESTE_ES_EL_ID`).
2. Abre tu archivo `.env` y agrega esta línea:
   ```env
   GOOGLE_DRIVE_FOLDER_ID=AQUÍ_PEGA_EL_ID_DE_LA_CARPETA
   ```

¡Y listo! Cuando enciendas `npm start`, Node.js tomará las llaves de `google-credentials.json`, subirá tu PDF directamente a esa carpeta, lo hará visible, y te imprimirá el enlace de descarga pública en la consola para que lo peguen en su Moodle.
