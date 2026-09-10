// Real-Time Collaborative Whiteboard Engine
let canvas, ctx;
let isDrawing = false;
let currentColor = '#000000';
let currentBrushSize = 4;
let isEraser = false;

function initWhiteboard() {
  canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse & Touch events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', handleTouch(startDrawing));
  canvas.addEventListener('touchmove', handleTouch(draw));
  canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvas() {
  const container = canvas.parentElement;
  if (!container) return;

  // Save canvas content
  let tempImage = null;
  if (canvas.width > 0 && canvas.height > 0) {
    tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  // Restore background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (tempImage) {
    ctx.putImageData(tempImage, 0, 0);
  }
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handleTouch(handler) {
  return (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    handler(mouseEvent);
  };
}

let lastPos = { x: 0, y: 0 };

function startDrawing(e) {
  isDrawing = true;
  lastPos = getPos(e);
}

function draw(e) {
  if (!isDrawing) return;
  const currentPos = getPos(e);

  const drawData = {
    x0: lastPos.x,
    y0: lastPos.y,
    x1: currentPos.x,
    y1: currentPos.y,
    color: isEraser ? '#ffffff' : currentColor,
    size: isEraser ? currentBrushSize * 4 : currentBrushSize
  };

  drawLine(drawData.x0, drawData.y0, drawData.x1, drawData.y1, drawData.color, drawData.size);

  // Broadcast to peers
  if (typeof socket !== 'undefined' && socket) {
    socket.emit('whiteboard_draw', drawData);
  }

  lastPos = currentPos;
}

function stopDrawing() {
  isDrawing = false;
}

function drawLine(x0, y0, x1, y1, color, size) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function setBrushColor(color) {
  currentColor = color;
  isEraser = false;
  document.getElementById('btn-eraser')?.classList.remove('active');
}

function setBrushSize(size) {
  currentBrushSize = Number(size);
}

function toggleEraser() {
  isEraser = !isEraser;
  document.getElementById('btn-eraser')?.classList.toggle('active', isEraser);
}

function clearWhiteboard(broadcast = true) {
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (broadcast && typeof socket !== 'undefined' && socket) {
    socket.emit('whiteboard_clear');
  }
}

function downloadWhiteboard() {
  const link = document.createElement('a');
  link.download = `whiteboard-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function toggleWhiteboardView() {
  const overlay = document.getElementById('whiteboard-overlay');
  const btn = document.getElementById('btn-toggle-whiteboard');

  if (overlay.classList.contains('active')) {
    overlay.classList.remove('active');
    btn?.classList.remove('active');
  } else {
    overlay.classList.add('active');
    btn?.classList.add('active');
    resizeCanvas();
  }
}
