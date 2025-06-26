import './style.css';
import GIF from 'gif.js';
import { inject } from '@vercel/analytics';

inject();

// Constants
const CANVAS_SIZE = 128;
const FONT_SIZE = 128;
const FRAME_DELAY_MS = 20; // minimum of 20ms or else renderer gets confused
const GIF_QUALITY = 10;
const GIF_WORKERS = 10;
const TEXT_STROKE_WIDTH = 10;
const DEBOUNCE_DELAY = 500;
const STROKE_COLOR = '#F6F9FB';
const MAX_OFFSET_GIFS = 12;
const MAX_SLACK_FRAMES = 50;

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
const offsetInput = document.getElementById('offset-input');

let debounceTimer = null;
let currentGif = null;

// Helper functions
function getSlackModeSettings(slackMode, speed) {
  if (!slackMode) {
    return {
      canvasSize: CANVAS_SIZE,
      fontSize: FONT_SIZE,
      pixelsPerFrame: speed,
      frameDelay: FRAME_DELAY_MS,
      quality: GIF_QUALITY,
      strokeWidth: TEXT_STROKE_WIDTH,
    };
  }

  return {
    canvasSize: 64,
    fontSize: 64,
    pixelsPerFrame: Math.max(0.1, speed * 0.3),
    frameDelay: 40,
    quality: 20,
    strokeWidth: 5,
  };
}

function calculateFrameSettings(
  totalWidth,
  pixelsPerFrame,
  frameDelay,
  slackMode,
) {
  let frames = Math.ceil(totalWidth / pixelsPerFrame);
  let adjustedPixelsPerFrame = pixelsPerFrame;
  let adjustedFrameDelay = frameDelay;

  if (slackMode) {
    const originalFrames = frames;
    frames = Math.min(frames, MAX_SLACK_FRAMES);

    if (originalFrames > MAX_SLACK_FRAMES) {
      const minRequiredPixelsPerFrame = totalWidth / MAX_SLACK_FRAMES;
      adjustedPixelsPerFrame = minRequiredPixelsPerFrame;
      const slowdownFactor = minRequiredPixelsPerFrame / pixelsPerFrame;
      adjustedFrameDelay = Math.floor(frameDelay * slowdownFactor);
    }
  }

  return { frames, adjustedPixelsPerFrame, adjustedFrameDelay };
}

function createGifInstance(canvasSize, quality) {
  return new GIF({
    workers: GIF_WORKERS,
    quality: quality,
    width: canvasSize,
    height: canvasSize,
    transparent: 0x000000,
    workerScript: '/gif.worker.js',
  });
}

function setupCanvasContext(canvas, fontSize, font, bold) {
  const ctx = canvas.getContext('2d');
  ctx.font = (bold ? 'bold ' : '') + fontSize + 'px ' + font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = false;
  ctx.textRenderingOptimization = 'optimizeSpeed';
  return ctx;
}

function displayGifs(gifBlobs, text, numGifs) {
  // Clean up previous GIFs
  if (currentGif && Array.isArray(currentGif)) {
    currentGif.forEach(url => URL.revokeObjectURL(url));
  } else if (currentGif) {
    URL.revokeObjectURL(currentGif);
  }

  currentGif = gifBlobs.map(blob => URL.createObjectURL(blob));

  gifDisplay.innerHTML = '';
  gifDisplay.style.display = 'flex';
  gifDisplay.style.flexDirection = 'row';
  gifDisplay.style.gap = '2px';

  currentGif.forEach((gifUrl, index) => {
    const img = document.createElement('img');
    img.src = gifUrl;
    img.alt = `Generated scrolling text GIF ${index + 1}`;
    img.addEventListener('contextmenu', e => {
      e.preventDefault();
      const link = document.createElement('a');
      link.href = gifUrl;
      const fileName =
        text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() +
        (numGifs > 1 ? `-${index + 1}` : '') +
        '.gif';
      link.download = fileName;
      link.click();
    });
    gifDisplay.appendChild(img);
  });

  loadingSpinner.style.display = 'none';
}

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
  const color = colorInput.value;
  const font = fontInput.value;
  const bold = boldInput.checked;
  const continuous = continuousInput.checked;
  const speed = parseFloat(speedInput.value);
  const slackMode = slackInput.checked;
  const offsetMode = offsetInput.checked;

  const settings = getSlackModeSettings(slackMode, speed);

  // Get text dimensions
  const measureCanvas = document.createElement('canvas');
  const measureCtx = setupCanvasContext(
    measureCanvas,
    settings.fontSize,
    font,
    bold,
  );

  // For continuous mode, create triple text to ensure seamless loop
  const displayText = continuous ? text + ' ' + text + ' ' + text : text;
  const textWidth = measureCtx.measureText(displayText).width;
  const singleTextWidth = measureCtx.measureText(text + ' ').width;
  const originalTextWidth = measureCtx.measureText(text).width;

  const totalWidth = continuous
    ? singleTextWidth
    : textWidth + settings.canvasSize;
  const initialWidthOffset = continuous ? singleTextWidth : 0;

  // Calculate number of GIFs needed for offset mode
  const numGifs = offsetMode
    ? Math.min(
        MAX_OFFSET_GIFS,
        Math.ceil(originalTextWidth / settings.canvasSize),
      )
    : 1;

  // Calculate frame settings
  const frameSettings = calculateFrameSettings(
    totalWidth,
    settings.pixelsPerFrame,
    settings.frameDelay,
    slackMode,
  );

  const gifs = [];

  for (let gifIndex = 0; gifIndex < numGifs; gifIndex++) {
    const offsetX = gifIndex * settings.canvasSize;
    const gif = createGifInstance(settings.canvasSize, settings.quality);

    for (let i = 0; i < frameSettings.frames; i++) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = settings.canvasSize;
      frameCanvas.height = settings.canvasSize;
      const frameCtx = setupCanvasContext(
        frameCanvas,
        settings.fontSize,
        font,
        bold,
      );

      const offset =
        initialWidthOffset + i * frameSettings.adjustedPixelsPerFrame;
      const x = settings.canvasSize - offset - offsetX;

      // Draw stroke with round line caps to avoid artifacts
      frameCtx.strokeStyle = STROKE_COLOR;
      frameCtx.lineWidth = settings.strokeWidth;
      frameCtx.lineJoin = 'round';
      frameCtx.lineCap = 'round';
      frameCtx.strokeText(displayText, x, settings.canvasSize / 2);

      // Draw colored fill
      frameCtx.fillStyle = color;
      frameCtx.fillText(displayText, x, settings.canvasSize / 2);

      gif.addFrame(frameCanvas, { delay: frameSettings.adjustedFrameDelay });
    }

    gifs.push(gif);
  }

  let completedGifs = 0;
  const gifBlobs = [];

  gifs.forEach((gif, index) => {
    gif.on('finished', function (blob) {
      gifBlobs[index] = blob;
      completedGifs++;

      if (completedGifs === numGifs) {
        displayGifs(gifBlobs, text, numGifs);
      }
    });

    gif.on('error', function (error) {
      console.error('GIF generation error:', error);
      loadingSpinner.style.display = 'none';
      gifDisplay.innerHTML = '<p>Error generating GIF</p>';
      gifDisplay.style.display = 'block';
    });

    gif.render();
  });
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
offsetInput.addEventListener('change', debouncedGenerateGIF);

debouncedGenerateGIF();
