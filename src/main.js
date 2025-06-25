import './style.css'
import GIF from 'gif.js'

const canvas = document.getElementById('preview-canvas')
const ctx = canvas.getContext('2d')
const textInput = document.getElementById('text-input')
const colorInput = document.getElementById('color-input')
const fontInput = document.getElementById('font-input')
const generateBtn = document.getElementById('generate-btn')
const downloadLink = document.getElementById('download-link')

let animationId = null
let scrollOffset = 0

function drawScrollingText() {
  const text = textInput.value || 'Hello World!'
  const color = colorInput.value
  const font = fontInput.value
  
  ctx.clearRect(0, 0, 128, 128)
  
  ctx.font = '16px ' + font
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  
  const textWidth = ctx.measureText(text).width
  const totalWidth = textWidth + 128
  
  const x = 128 - (scrollOffset % totalWidth)
  ctx.fillText(text, x, 64)
  
  if (x + textWidth < 128) {
    ctx.fillText(text, x + totalWidth, 64)
  }
  
  scrollOffset += 2
}

function startPreview() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  function animate() {
    drawScrollingText()
    animationId = requestAnimationFrame(animate)
  }
  
  animate()
}

function generateGIF() {
  const text = textInput.value || 'Hello World!'
  const color = colorInput.value
  const font = fontInput.value
  
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: 128,
    height: 128,
    transparent: 0x000000
  })
  
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = 128
  tempCanvas.height = 128
  const tempCtx = tempCanvas.getContext('2d')
  
  tempCtx.font = '16px ' + font
  const textWidth = tempCtx.measureText(text).width
  const totalWidth = textWidth + 128
  const frames = Math.ceil(totalWidth / 2)
  
  for (let i = 0; i < frames; i++) {
    tempCtx.clearRect(0, 0, 128, 128)
    tempCtx.fillStyle = color
    tempCtx.textAlign = 'left'
    tempCtx.textBaseline = 'middle'
    
    const offset = i * 2
    const x = 128 - (offset % totalWidth)
    
    tempCtx.fillText(text, x, 64)
    
    if (x + textWidth < 128) {
      tempCtx.fillText(text, x + totalWidth, 64)
    }
    
    gif.addFrame(tempCanvas, { delay: 50 })
  }
  
  gif.on('finished', function(blob) {
    const url = URL.createObjectURL(blob)
    downloadLink.innerHTML = `<a href="${url}" download="scrolling-text.gif">Download GIF</a>`
  })
  
  gif.render()
  generateBtn.textContent = 'Generating...'
  generateBtn.disabled = true
  
  setTimeout(() => {
    generateBtn.textContent = 'Generate GIF'
    generateBtn.disabled = false
  }, 2000)
}

textInput.addEventListener('input', startPreview)
colorInput.addEventListener('input', startPreview)
fontInput.addEventListener('change', startPreview)
generateBtn.addEventListener('click', generateGIF)

startPreview()