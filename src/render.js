import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Simple local HTTP server to serve ES modules and data cleanly
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      const filePath = path.join(ROOT_DIR, reqPath);

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end('Not Found');
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.css': 'text/css',
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json'
      };

      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function renderAnimation() {
  console.log('--- Starting 3D PUBG GitHub Contribution Battle Arena Renderer ---');

  const { server, port } = await startServer();
  const url = `http://127.0.0.1:${port}/index.html`;
  console.log(`Local WebGL host started on ${url}`);

  const outputDir = path.join(ROOT_DIR, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const webpPath = path.join(outputDir, 'contrib-battle.webp');
  const gifPath = path.join(outputDir, 'contrib-battle.gif');

  // Find local Chrome or Edge if Puppeteer bundled chrome is not downloaded
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  let executablePath = candidatePaths.find(p => fs.existsSync(p));

  // Launch Puppeteer
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
    console.log(`Using system browser at: ${executablePath}`);
  }

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 480, deviceScaleFactor: 1 });

  console.log('Navigating to WebGL arena viewport...');
  await page.goto(url, { waitUntil: 'networkidle0' });

  await page.waitForFunction(() => window.isReady === true, { timeout: 15000 });
  console.log('Three.js scene verified & ready.');

  // Render parameters: 6 seconds seamless loop at 30 FPS = 180 frames
  const FPS = 30;
  const DURATION_SEC = 6.0;
  const TOTAL_FRAMES = 180;

  console.log(`Starting deterministic frame capture: ${TOTAL_FRAMES} frames @ ${FPS} FPS...`);

  // Spawn FFmpeg to encode animated WebP directly from piped PNG frames
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-i', '-',
    '-c:v', 'libwebp',
    '-lossless', '0',
    '-q:v', '78',
    '-loop', '0',
    '-preset', 'picture',
    '-pix_fmt', 'yuv420p',
    webpPath
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stderr.on('data', (d) => {
    // console.log(`ffmpeg: ${d}`);
  });

  const startTime = Date.now();

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const timeInSec = (f / TOTAL_FRAMES) * DURATION_SEC;

    // Step WebGL simulation deterministically
    await page.evaluate((t) => window.seekToTime(t), timeInSec);

    // Capture crisp frame buffer
    const frameBuffer = await page.screenshot({ type: 'png', omitBackground: false });

    // Pipe directly into FFmpeg
    ffmpeg.stdin.write(frameBuffer);

    if (f % 30 === 0 || f === TOTAL_FRAMES - 1) {
      const progress = Math.round(((f + 1) / TOTAL_FRAMES) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`Capturing frames: ${f + 1}/${TOTAL_FRAMES} (${progress}%) - [${elapsed}s]\r`);
    }
  }

  console.log('\nFinalizing WebP encoding...');
  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  // Also generate GIF fallback for environments that prefer GIF
  console.log('Generating optimized GIF fallback...');
  const gifArgs = [
    '-y',
    '-i', webpPath,
    '-vf', 'fps=20,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer',
    gifPath
  ];
  await new Promise((resolve) => {
    const fGif = spawn('ffmpeg', gifArgs);
    fGif.on('close', resolve);
  });

  await browser.close();
  server.close();

  const webpSize = (fs.statSync(webpPath).size / (1024 * 1024)).toFixed(2);
  const gifSize = fs.existsSync(gifPath) ? (fs.statSync(gifPath).size / (1024 * 1024)).toFixed(2) : 'N/A';

  console.log('\n======================================================');
  console.log(`✅ Battle Arena Animation Rendered Successfully!`);
  console.log(`Output WebP: ${webpPath} (${webpSize} MB)`);
  console.log(`Output GIF:  ${gifPath} (${gifSize} MB)`);
  console.log('======================================================\n');
}

renderAnimation().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
