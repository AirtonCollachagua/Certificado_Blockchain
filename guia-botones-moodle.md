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

### Opción B: Usar una "Etiqueta" o "Bloque HTML" (Más fácil)
Si no quieres tocar el código PHP, puedes ir al curso de Moodle:
1. Activa el modo de edición.
2. Agrega un recurso tipo **Etiqueta** o un **Bloque HTML** justo debajo del certificado.
3. En el contenido, selecciona "Vista de código HTML" (`<>`) y pega esto:

```html
<div style="text-align: center; border: 2px solid #28a745; padding: 15px; border-radius: 10px; background-color: #f8fff9;">
    <h4 style="color: #28a745;">¡Certificación Asegurada con IT!</h4>
    <p>Una vez que hayas hecho clic en el botón de Moodle para generar tu certificado, descarga tu copia auténtica e inmutable aquí:</p>
    
    <a id="btn-blockchain" href="#" target="_blank" class="btn btn-primary" style="background-color: #007bff; padding: 12px 25px; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        DESCARGAR CERTIFICADO OFICIAL (BLOCKCHAIN)
    </a>
</div>

<script>
    // Script sencillo para autodetectar al alumno y al actividad (módulo)
    const urlParams = new URLSearchParams(window.location.search);
    const modId = urlParams.get('id'); // ID de la actividad customcert
    const userId = M.cfg.userid; // Variable global de Moodle para el ID del usuario
    const bucket = "certificados_geosys";
    const downloadLink = `https://storage.googleapis.com/${bucket}/certificado_id${modId}_u${userId}.pdf`;
    
    document.getElementById('btn-blockchain').href = downloadLink;
</script>
```

---

### ¿Cómo queda el flujo ahora?
1. El alumno entra a Moodle y ve el botón clásico: **"Descargar Certificado"**.
2. Al darle clic, Moodle genera el evento -> Nuestro Node.js lo captura -> Se registra en Blockchain -> Se sube a Google Cloud.
3. El alumno verá el nuevo botón: **"DESCARGAR CERTIFICADO OFICIAL (BLOCKCHAIN)"**.
4. Al hacer clic en el nuevo botón, descarga el PDF puro de Google Cloud, el cual **SÍ saldrá en VERDE** en tu validador para siempre.

¿Cuál de las dos opciones crees que sea más fácil de aplicar con tu equipo de sistemas?
