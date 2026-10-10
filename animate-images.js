#!/usr/bin/env node
/**
 * animate-images.js
 * Convierte imágenes en clips de vídeo animados (efecto Ken Burns) con FFmpeg.
 * Sin APIs ni claves. Usa @ffmpeg-installer/ffmpeg si está instalado
 * (ya está en las dependencias de video-maker) o el ffmpeg del sistema.
 *
 * Uso:
 *   node animate-images.js <imagen|carpeta> [opciones]
 *
 * Opciones:
 *   --effect   zoom-in | zoom-out | pan-left | pan-right | pan-up | pan-down | random  (def: random)
 *   --duration segundos por imagen                     (def: 5)
 *   --width    ancho de salida                         (def: 1280)
 *   --height   alto de salida                          (def: 720)
 *   --fps      fotogramas por segundo                  (def: 30)
 *   --out      carpeta de salida                       (def: ./output)
 *   --join     une todos los clips en un solo vídeo    (flag)
 *
 * Como módulo:
 *   const { animateImage, animateFolder } = require('./animate-images')
 *   await animateImage('foto.jpg', 'foto.mp4', { effect: 'zoom-in' })
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const EFFECTS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down']
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp'])

function ffmpegPath() {
  try {
    return require('@ffmpeg-installer/ffmpeg').path
  } catch (e) {
    return 'ffmpeg'
  }
}

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', d => (err += d))
    p.on('error', reject)
    p.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg falló (${code}):\n${err.slice(-800)}`))
    )
  })
}

// Expresiones de zoompan: z = zoom, x/y = posición de la ventana. `on` = nº de fotograma, D = total.
function zoompanExpr(effect, D) {
  const center = { x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' }
  const progress = `on/${D}`
  switch (effect) {
    case 'zoom-in':
      return { z: `1+0.25*${progress}`, ...center }
    case 'zoom-out':
      return { z: `1.25-0.25*${progress}`, ...center }
    case 'pan-left':
      return { z: '1.2', x: `(iw-iw/zoom)*(1-${progress})`, y: center.y }
    case 'pan-right':
      return { z: '1.2', x: `(iw-iw/zoom)*${progress}`, y: center.y }
    case 'pan-up':
      return { z: '1.2', x: center.x, y: `(ih-ih/zoom)*(1-${progress})` }
    case 'pan-down':
      return { z: '1.2', x: center.x, y: `(ih-ih/zoom)*${progress}` }
    default:
      throw new Error(`Efecto desconocido: ${effect}`)
  }
}

async function animateImage(input, output, opts = {}) {
  const { duration = 5, width = 1280, height = 720, fps = 30 } = opts
  let effect = opts.effect || 'random'
  if (effect === 'random') effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)]

  const D = Math.round(duration * fps)
  const { z, x, y } = zoompanExpr(effect, D)

  // 1) Ajusta la imagen al formato de salida (recorte centrado) al doble de tamaño
  //    para que el zoom salga suave. 2) zoompan genera los fotogramas.
  const filter = [
    `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase`,
    `crop=${width * 2}:${height * 2}`,
    `zoompan=z='${z}':x='${x}':y='${y}':d=${D}:s=${width}x${height}:fps=${fps}`,
    'format=yuv420p'
  ].join(',')

  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
  await run(['-y', '-loop', '1', '-i', input, '-vf', filter, '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', output])
  return { output, effect }
}

async function animateFolder(dir, outDir, opts = {}) {
  const files = fs.readdirSync(dir)
    .filter(f => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort()
  if (!files.length) throw new Error(`No hay imágenes en ${dir}`)

  const clips = []
  for (const [i, f] of files.entries()) {
    const out = path.join(outDir, `${path.parse(f).name}.mp4`)
    const r = await animateImage(path.join(dir, f), out, opts)
    console.log(`[${i + 1}/${files.length}] ${f} -> ${out} (${r.effect})`)
    clips.push(out)
  }

  if (opts.join) {
    const list = path.join(outDir, 'clips.txt')
    fs.writeFileSync(list, clips.map(c => `file '${path.resolve(c)}'`).join('\n'))
    const final = path.join(outDir, 'final.mp4')
    await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', final])
    fs.unlinkSync(list)
    console.log(`Vídeo final: ${final}`)
    return [final]
  }
  return clips
}

module.exports = { animateImage, animateFolder, EFFECTS }

// ---------- CLI ----------
if (require.main === module) {
  const args = process.argv.slice(2)
  const input = args[0]
  if (!input || input.startsWith('--')) {
    console.log('Uso: node animate-images.js <imagen|carpeta> [--effect zoom-in] [--duration 5] [--join]')
    process.exit(1)
  }
  const opt = {}
  for (let i = 1; i < args.length; i++) {
    const k = args[i].replace(/^--/, '')
    if (k === 'join') opt.join = true
    else opt[k] = isNaN(args[i + 1]) ? args[++i] : Number(args[++i])
  }
  const outDir = opt.out || './output'
  ;(async () => {
    try {
      if (fs.statSync(input).isDirectory()) {
        await animateFolder(input, outDir, opt)
      } else {
        const out = path.join(outDir, `${path.parse(input).name}.mp4`)
        const r = await animateImage(input, out, opt)
        console.log(`Listo: ${r.output} (${r.effect})`)
      }
    } catch (e) {
      console.error(e.message)
      process.exit(1)
    }
  })()
}
