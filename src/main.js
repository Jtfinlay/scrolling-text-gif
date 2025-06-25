import './style.css';
import GIF from 'gif.js';

// Constants
const CANVAS_SIZE = 128;
const FONT_SIZE = 128;
const SCROLL_SPEED = 4;
const GIF_FRAME_DELAY = 25;
const GIF_QUALITY = 10;
const GIF_WORKERS = 2;
const GENERATION_TIMEOUT = 2000;
const TEXT_STROKE_WIDTH = 10;

const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('text-input');
const colorInput = document.getElementById('color-input');
const fontInput = document.getElementById('font-input');
const generateBtn = document.getElementById('generate-btn');
const downloadLink = document.getElementById('download-link');

let animationId = null;
let scrollOffset = 0;

function drawScrollingText() {
  const text = textInput.value || 'Hello World!';
  const color = colorInput.value;
  const font = fontInput.value;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.font = FONT_SIZE + 'px ' + font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const totalWidth = textWidth + CANVAS_SIZE;

  const x = CANVAS_SIZE - (scrollOffset % totalWidth);

  // Draw black stroke/border
  ctx.strokeStyle = 'black';
  ctx.lineWidth = TEXT_STROKE_WIDTH;
  ctx.strokeText(text, x, CANVAS_SIZE / 2);

  // Draw colored fill
  ctx.fillStyle = color;
  ctx.fillText(text, x, CANVAS_SIZE / 2);

  if (x + textWidth < CANVAS_SIZE) {
    // Draw black stroke/border for second instance
    ctx.strokeText(text, x + totalWidth, CANVAS_SIZE / 2);
    // Draw colored fill for second instance
    ctx.fillText(text, x + totalWidth, CANVAS_SIZE / 2);
  }

  scrollOffset += SCROLL_SPEED;
}

function startPreview() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  function animate() {
    drawScrollingText();
    animationId = requestAnimationFrame(animate);
  }

  animate();
}

function generateGIF() {
  const text = textInput.value || 'Hello World!';
  const color = colorInput.value;
  const font = fontInput.value;

  const gif = new GIF({
    workers: GIF_WORKERS,
    quality: GIF_QUALITY,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    transparent: 0x000000,
  });

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = CANVAS_SIZE;
  tempCanvas.height = CANVAS_SIZE;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.font = FONT_SIZE + 'px ' + font;
  tempCtx.textAlign = 'left';
  tempCtx.textBaseline = 'middle';

  const textWidth = tempCtx.measureText(text).width;
  const totalWidth = textWidth + CANVAS_SIZE;
  const frames = Math.ceil(totalWidth / SCROLL_SPEED);

  for (let i = 0; i < frames; i++) {
    tempCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const offset = i * SCROLL_SPEED;
    const x = CANVAS_SIZE - (offset % totalWidth);

    // Draw black stroke/border
    tempCtx.strokeStyle = 'black';
    tempCtx.lineWidth = TEXT_STROKE_WIDTH;
    tempCtx.strokeText(text, x, CANVAS_SIZE / 2);

    // Draw colored fill
    tempCtx.fillStyle = color;
    tempCtx.fillText(text, x, CANVAS_SIZE / 2);

    if (x + textWidth < CANVAS_SIZE) {
      // Draw black stroke/border for second instance
      tempCtx.strokeText(text, x + totalWidth, CANVAS_SIZE / 2);
      // Draw colored fill for second instance
      tempCtx.fillText(text, x + totalWidth, CANVAS_SIZE / 2);
    }

    gif.addFrame(tempCanvas, { delay: GIF_FRAME_DELAY });
  }

  gif.on('finished', function (blob) {
    const url = URL.createObjectURL(blob);
    downloadLink.innerHTML = `<a href="${url}" download="scrolling-text.gif">Download GIF</a>`;
  });

  gif.render();
  generateBtn.textContent = 'Generating...';
  generateBtn.disabled = true;

  setTimeout(() => {
    generateBtn.textContent = 'Generate GIF';
    generateBtn.disabled = false;
  }, GENERATION_TIMEOUT);
}

textInput.addEventListener('input', startPreview);
colorInput.addEventListener('input', startPreview);
fontInput.addEventListener('change', startPreview);
generateBtn.addEventListener('click', generateGIF);

startPreview();
