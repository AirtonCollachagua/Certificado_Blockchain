# Guía de Integración Final: Botones en Moodle

Para que los alumnos descarguen el "Certificado Auténtico" directamente de Google Cloud (y no el de Moodle que cambia los bytes), debemos modificar la interfaz del plugin `mod_customcert`.

### La Estrategia: URLs Predecibles
Como configuramos nuestro servidor para guardar los archivos con un nombre estándar, la URL siempre será:
`https://storage.googleapis.com/NOMBRE_DE_TU_BUCKET/certificado_idX_uY.pdf` (Donde X es el ID de la actividad y Y el ID del alumno).

---

### Opción A: Modificar el código PHP (Recomendado para expertos)
Debes entrar a tu servidor Moodle y buscar el archivo:
`SERVER_MOODLE/mod/customcert/view.php`

Busca la línea donde se imprime el botón original (aprox. línea 120-150) y agrega este bloque de código PHP para mostrar el segundo botón:

```php
// --- BOTÓN BLOCKCHAIN PERUPETRO ---
$bucket_name = "certificados_geosys"; // Tu bucket de Google Cloud
$blockchain_url = "https://storage.googleapis.com/$bucket_name/certificado_id{$cm->id}_u{$USER->id}.pdf";

echo '<br><br>';
echo '<a href="'.$blockchain_url.'" target="_blank" class="btn btn-success" style="background-color: #28a745; border-color: #28a745; padding: 10px 20px; font-weight: bold;">';
echo '   Descargar Certificado Auténtico (Verificado en Blockchain)';
echo '</a>';
// ---------------------------------
```

---

---

### Opción B: Usar una "Etiqueta" o "Bloque HTML" (¡LA MÁS RECOMENDADA!)
Esta opción es la mejor porque **"secuestra" el botón original de Moodle** para que NO descargue nada, sino que solo "emita" el certificado y luego te muestre el link de Google Cloud.

1. Ve a tu curso en Moodle, activa edición y agrega una **Etiqueta** o **Bloque HTML** justo arriba o abajo del certificado.
2. Pega este código (asegúrate de usar el modo "Vista HTML" o `<>`):

```html
<div id="blockchain-area" style="text-align: center; border: 2px solid #28a745; padding: 20px; border-radius: 12px; background-color: #f8fff9; margin: 20px 0;">
    <h3 style="color: #28a745; margin-top: 0;">🛡️ Sistema de Certificación Blockchain</h3>
    <p id="bc-status">Para obtener tu certificado oficial e inmutable, haz clic en el botón de abajo:</p>
    
    <!-- Este es el botón que el alumno verá -->
    <button id="btn-generar-bc" class="btn btn-success" style="background-color: #28a745; border: none; padding: 15px 30px; font-weight: bold; font-size: 1.1em; cursor: pointer; border-radius: 8px; color: white;">
        GENERAR Y REGISTRAR EN BLOCKCHAIN
    </button>

    <!-- Este botón está oculto al inicio y aparecerá cuando el robot termine -->
    <a id="btn-descargar-bc" href="#" target="_blank" class="btn btn-primary" style="display: none; background-color: #007bff; padding: 15px 30px; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1em; border: none; cursor: pointer;">
        ⬇️ DESCARGAR CERTIFICADO AUTÉNTICO (GCS)
    </a>
</div>

<script>
(function() {
    // 1. Detectar datos de Moodle de forma ROBUSTA
    const urlParams = new URLSearchParams(window.location.search);
    const modId = urlParams.get('id'); 
    
    // Intentamos 3 formas de obtener el User ID
    let userId = (typeof M !== 'undefined' && M.cfg && M.cfg.userid) ? M.cfg.userid : null;
    
    // Si falla, lo buscamos en el enlace del perfil (Casi siempre está en el menú superior)
    if (!userId) {
        const userLink = document.querySelector('a[href*="/user/profile.php?id="]');
        if (userLink) {
            const match = userLink.href.match(/id=(\d+)/);
            if (match) userId = match[1];
        }
    }

    if (!userId) {
        console.error("No se pudo detectar el ID del usuario de Moodle.");
        alert("Atención: No se detectó tu sesión de usuario. Intenta recargar la página.");
        return;
    }

    const bucket = "certificados_geosys";
    const gcsLink = `https://storage.googleapis.com/${bucket}/certificado_id${modId}_u${userId}.pdf`;

    // 2. Buscamos el botón original de Moodle y lo ocultamos
    const originalBtn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
                        .find(el => el.textContent.includes('Descargar certificado') || el.value === 'Descargar certificado');
    
    if (originalBtn) {
        originalBtn.style.display = 'none'; 
    }

    const btnGenerar = document.getElementById('btn-generar-bc');
    const btnDescargar = document.getElementById('btn-descargar-bc');
    const txtStatus = document.getElementById('bc-status');

    btnGenerar.onclick = function() {
        btnGenerar.disabled = true;
        btnGenerar.innerHTML = "⌛ Procesando en Blockchain... (No cierres esta página)";
        btnGenerar.style.opacity = "0.7";

        if (originalBtn) {
            const form = originalBtn.closest('form');
            if (form) {
                const formData = new FormData(form);
                fetch(form.action, {
                    method: 'POST',
                    body: formData
                }).then(() => {
                    console.log("Webhook disparado: cert_id" + modId + "_u" + userId);
                    
                    // Esperamos 4 segundos a que el Robot procese
                    setTimeout(() => {
                        btnGenerar.style.display = 'none';
                        btnDescargar.href = gcsLink;
                        btnDescargar.style.display = 'inline-block';
                        txtStatus.innerHTML = "✅ ¡Listo! Tu certificado ha sido emitido y sellado. Descárgalo aquí:";
                    }, 4000);
                }).catch(err => {
                    alert("Error al conectar con Moodle. Por favor recarga la página.");
                });
            }
        } else {
            alert("No se encontró el botón de generación. Recarga la página.");
        }
    };
})();
</script>
```

### ¿Qué hace este código exactamente?
1. **Oculta** el botón feo de Moodle que te obliga a descargar el archivo "mutante".
2. **Muestra** un botón elegante de "Generar en Blockchain".
3. Al darle clic, **simula la pulsación del botón original por detrás** (Fetch). Esto hace que Moodle "emita" el certificado y mande el Webhook a nuestro servidor Node.js.
4. Espera unos segundos a que el Robot termine su trabajo y luego **te muestra el link de Google Cloud Storage**.

¡De esta forma el usuario nunca llega a ver ni a descargar el PDF "malo" de Moodle! Solo ve el oficial.

¿Te animas a probar pegando este código en un bloque HTML de tu curso?


---

### ¿Cómo queda el flujo ahora?
1. El alumno entra a Moodle y ve el botón clásico: **"Descargar Certificado"**.
2. Al darle clic, Moodle genera el evento -> Nuestro Node.js lo captura -> Se registra en Blockchain -> Se sube a Google Cloud.
3. El alumno verá el nuevo botón: **"DESCARGAR CERTIFICADO OFICIAL (BLOCKCHAIN)"**.
4. Al hacer clic en el nuevo botón, descarga el PDF puro de Google Cloud, el cual **SÍ saldrá en VERDE** en tu validador para siempre.

¿Cuál de las dos opciones crees que sea más fácil de aplicar con tu equipo de sistemas?
