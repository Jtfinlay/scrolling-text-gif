import './style.css';
import GIF from 'gif.js';
import { inject } from '@vercel/analytics';

inject();

// Constants
const CANVAS_SIZE = 128;
const FONT_SIZE = 128;
const PIXELS_PER_FRAME = 4;
const FRAME_DELAY_MS = 20; // minimum of 20ms or else renderer gets confused
const GIF_QUALITY = 10;
const GIF_WORKERS = 10;
const TEXT_STROKE_WIDTH = 10;
const DEBOUNCE_DELAY = 500;
const FILL_COLOR = '#635BFF';
const STROKE_COLOR = '#F6F9FB';

const gifDisplay = document.getElementById('gif-display');
const loadingSpinner = document.getElementById('loading-spinner');
const textInput = document.getElementById('text-input');
const colorInput = document.getElementById('color-input');
const fontInput = document.getElementById('font-input');
const boldInput = document.getElementById('bold-input');
const continuousInput = document.getElementById('continuous-input');
const speedInput = document.getElementById('speed-input');
const speedValue = document.getElementById('speed-value');
const slackInput = document.getElementById('slack-input');

let debounceTimer = null;
let currentGif = null;

function debouncedGenerateGIF() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  loadingSpinner.style.display = 'block';
  gifDisplay.style.display = 'none';

  debounceTimer = setTimeout(() => {
    generateGIF();
  }, DEBOUNCE_DELAY);
}

function generateGIF() {
  const text = textInput.value || 'Hello World!';
  const color = colorInput.value || FILL_COLOR;
  const font = fontInput.value;
  const bold = boldInput.checked;
  const continuous = continuousInput.checked;
  const speed = parseFloat(speedInput.value);
  const slackMode = slackInput.checked;

  // Slack mode optimizations
  const canvasSize = slackMode ? 64 : CANVAS_SIZE;
  const fontSize = slackMode ? 64 : FONT_SIZE;
  const baseFrameDelay = slackMode ? 40 : FRAME_DELAY_MS;
  const quality = slackMode ? 20 : GIF_QUALITY;
  const strokeWidth = slackMode ? 5 : TEXT_STROKE_WIDTH;

  const gif = new GIF({
    workers: GIF_WORKERS,
    quality: quality,
    width: canvasSize,
    height: canvasSize,
    transparent: 0x000000,
    workerScript: '/gif.worker.js',
  });

  // Get text dimensions
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = (bold ? 'bold ' : '') + fontSize + 'px ' + font;

  // For continuous mode, create triple text to ensure seamless loop
  const displayText = continuous ? text + ' ' + text + ' ' + text : text;
  const textWidth = measureCtx.measureText(displayText).width;
  const singleTextWidth = measureCtx.measureText(text + ' ').width;
  const totalWidth = continuous ? singleTextWidth : textWidth + canvasSize;
  const initialWidthOffset = continuous ? singleTextWidth : 0;
  let frames = Math.ceil(totalWidth / speed);
  let adjustedPixelsPerFrame = speed;
  let frameDelay = baseFrameDelay;

  // Cap frames to 50 in Slack mode and adjust speed to ensure full text scroll
  if (slackMode) {
    const originalFrames = frames;
    frames = Math.min(frames, 50);
    if (originalFrames > 50) {
      const minRequiredPixelsPerFrame = totalWidth / 50;

      // User wants it slower than min speed allows in 50 frames
      // Use minimum speed but extend frame delay to compensate
      adjustedPixelsPerFrame = minRequiredPixelsPerFrame;
      const slowdownFactor = minRequiredPixelsPerFrame / speed;
      frameDelay = Math.floor(baseFrameDelay * slowdownFactor);
    }
  }

  for (let i = 0; i < frames; i++) {
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = canvasSize;
    frameCanvas.height = canvasSize;
    const frameCtx = frameCanvas.getContext('2d');

    frameCtx.font = (bold ? 'bold ' : '') + fontSize + 'px ' + font;
    frameCtx.textAlign = 'left';
    frameCtx.textBaseline = 'middle';
    frameCtx.imageSmoothingEnabled = false;
    frameCtx.textRenderingOptimization = 'optimizeSpeed';

    const offset = initialWidthOffset + i * adjustedPixelsPerFrame;
    const x = canvasSize - offset;

    // Draw stroke with round line caps to avoid artifacts
    frameCtx.strokeStyle = STROKE_COLOR;
    frameCtx.lineWidth = strokeWidth;
    frameCtx.lineJoin = 'round';
    frameCtx.lineCap = 'round';
    frameCtx.strokeText(displayText, x, canvasSize / 2);

    // Draw colored fill
    frameCtx.fillStyle = color;
    frameCtx.fillText(displayText, x, canvasSize / 2);

    gif.addFrame(frameCanvas, { delay: frameDelay });
  }

  gif.on('finished', function (blob) {
    if (currentGif) {
      URL.revokeObjectURL(currentGif);
    }

    currentGif = URL.createObjectURL(blob);

    const img = document.createElement('img');
    img.src = currentGif;
    img.alt = 'Generated scrolling text GIF';
    img.addEventListener('contextmenu', e => {
      e.preventDefault();
      const link = document.createElement('a');
      link.href = currentGif;
      const fileName =
        text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '.gif';
      link.download = fileName;
      link.click();
    });

    gifDisplay.innerHTML = '';
    gifDisplay.appendChild(img);
    gifDisplay.style.display = 'block';
    loadingSpinner.style.display = 'none';
  });

  gif.on('error', function (error) {
    console.error('GIF generation error:', error);
    loadingSpinner.style.display = 'none';
    gifDisplay.innerHTML = '<p>Error generating GIF</p>';
    gifDisplay.style.display = 'block';
  });

  gif.render();
}

textInput.addEventListener('input', debouncedGenerateGIF);
colorInput.addEventListener('input', debouncedGenerateGIF);
fontInput.addEventListener('change', debouncedGenerateGIF);
boldInput.addEventListener('change', debouncedGenerateGIF);
continuousInput.addEventListener('change', debouncedGenerateGIF);
speedInput.addEventListener('input', e => {
  speedValue.textContent = e.target.value;
  debouncedGenerateGIF();
});
slackInput.addEventListener('change', debouncedGenerateGIF);

debouncedGenerateGIF();
