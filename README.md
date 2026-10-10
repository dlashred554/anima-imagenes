# anima-imagenes

Convierte imágenes en vídeos animados (zoom y desplazamiento de cámara tipo *Ken Burns*) usando FFmpeg.
No necesita APIs, claves ni GPU, y funciona en Windows, macOS y Linux.

## Versión web

`index.html` es una página que funciona entera en el navegador (sin servidor ni claves): arrastras tus imágenes,
eliges efecto, duración, transición y formato (horizontal, vertical o cuadrado) y descargas el vídeo.

- **Probarla en local:** abre `index.html` con doble clic.
- **Publicarla gratis con GitHub Pages:** en el repositorio ve a *Settings → Pages*, elige *Deploy from a branch*,
  rama `main` y carpeta `/ (root)`. En un minuto estará en `https://dlashred554.github.io/anima-imagenes/`.
- El vídeo se graba en tiempo real: mantén la pestaña visible mientras se crea. Sale en MP4 si el navegador lo permite, y si no en WebM.

## Versión por terminal (Node.js)

### Instalación

```bash
git clone https://github.com/dlashred554/anima-imagenes.git
cd anima-imagenes
npm install
```

### Uso rápido

1. Pon tus imágenes (`.jpg`, `.png`, `.webp`, `.bmp`) en la carpeta `images/`.
2. Ejecuta:

```bash
npm run animar
```

El resultado queda en `output/final.mp4` (y un clip por cada imagen).

### Uso avanzado

```bash
# Una sola imagen
npm start -- foto.jpg --effect zoom-in --duration 5

# Carpeta entera, 3 s por imagen, unida en un vídeo
npm start -- ./images --duration 3 --join --out ./output
```

| Opción       | Descripción                                                                 | Por defecto |
|--------------|-----------------------------------------------------------------------------|-------------|
| `--effect`   | `zoom-in`, `zoom-out`, `pan-left`, `pan-right`, `pan-up`, `pan-down`, `random` | `random`    |
| `--duration` | Segundos por imagen                                                         | `5`         |
| `--width`    | Ancho del vídeo                                                             | `1280`      |
| `--height`   | Alto del vídeo                                                              | `720`       |
| `--fps`      | Fotogramas por segundo                                                      | `30`        |
| `--out`      | Carpeta de salida                                                           | `./output`  |
| `--join`     | Une todos los clips en `final.mp4`                                          | desactivado |

### Como módulo

```js
const { animateImage, animateFolder } = require('./src/animate-images')

await animateImage('images/foto.jpg', 'output/foto.mp4', { effect: 'zoom-in', duration: 4 })
await animateFolder('./images', './output', { effect: 'random', join: true })
```

## Licencia

MIT
