// WebRTC Mesh Multi-Peer Video Engine
let localStream = null;
let screenStream = null;
let isScreenSharing = false;
let isAudioMuted = false;
let isVideoMuted = false;
const peerConnections = new Map(); // socketId -> RTCPeerConnection

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

async function initLocalMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = localStream;
  } catch (err) {
    console.warn('Camera/Mic permission denied or not available, creating mock canvas stream:', err);
    // Create mock stream for environments without camera
    localStream = createMockMediaStream();
    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = localStream;
  }
}

function createMockMediaStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  
  let frame = 0;
  function draw() {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(320, 180, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('User Camera Active', 320, 185);
    frame++;
    requestAnimationFrame(draw);
  }
  draw();

  const stream = canvas.captureStream(30);
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const dst = osc.connect(audioCtx.createMediaStreamDestination());
  osc.start();
  const audioTrack = dst.stream.getAudioTracks()[0];
  if (audioTrack) stream.addTrack(audioTrack);

  return stream;
}

function createPeerConnection(targetSocketId, targetName) {
  if (peerConnections.has(targetSocketId)) {
    return peerConnections.get(targetSocketId);
  }

  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(targetSocketId, pc);

  // Add local tracks to peer connection
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  // Handle incoming remote stream
  pc.ontrack = (event) => {
    console.log(`Received remote track from ${targetSocketId}`);
    addRemoteVideo(targetSocketId, targetName, event.streams[0]);
  };

  // ICE Candidate exchange
  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('webrtc_signal', {
        targetSocketId,
        signal: { candidate: event.candidate },
        senderName: currentUserName
      });
    }
  };

  return pc;
}

async function callPeer(targetSocketId, targetName) {
  const pc = createPeerConnection(targetSocketId, targetName);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('webrtc_signal', {
      targetSocketId,
      signal: { sdp: pc.localDescription },
      senderName: currentUserName
    });
  } catch (err) {
    console.error('Error creating offer:', err);
  }
}

async function handleIncomingSignal({ senderSocketId, senderName, signal }) {
  const pc = createPeerConnection(senderSocketId, senderName);

  try {
    if (signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

      if (signal.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_signal', {
          targetSocketId: senderSocketId,
          signal: { sdp: pc.localDescription },
          senderName: currentUserName
        });
      }
    } else if (signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  } catch (err) {
    console.error('Error handling WebRTC signal:', err);
  }
}

function addRemoteVideo(socketId, name, stream) {
  let card = document.getElementById(`peer-card-${socketId}`);
  if (!card) {
    card = document.createElement('div');
    card.className = 'video-card';
    card.id = `peer-card-${socketId}`;
    card.innerHTML = `
      <video id="peer-video-${socketId}" class="video-element peer-video" autoplay playsinline></video>
      <div class="video-overlay-name">
        <i class="fas fa-user"></i>
        <span>${name || 'Participant'}</span>
      </div>
    `;
    document.getElementById('video-grid').appendChild(card);
  }

  const video = document.getElementById(`peer-video-${socketId}`);
  if (video) video.srcObject = stream;
}

function removeRemoteVideo(socketId) {
  const card = document.getElementById(`peer-card-${socketId}`);
  if (card) card.remove();
  const pc = peerConnections.get(socketId);
  if (pc) {
    pc.close();
    peerConnections.delete(socketId);
  }
}

// Media Controls: Mic Mute
function toggleAudio() {
  if (!localStream) return;
  isAudioMuted = !isAudioMuted;
  localStream.getAudioTracks().forEach(track => track.enabled = !isAudioMuted);

  const btn = document.getElementById('btn-toggle-mic');
  if (btn) {
    btn.classList.toggle('muted', isAudioMuted);
    btn.innerHTML = isAudioMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
  }

  socket?.emit('media_state_change', { audio: !isAudioMuted, video: !isVideoMuted });
}

// Media Controls: Camera Mute
function toggleVideo() {
  if (!localStream) return;
  isVideoMuted = !isVideoMuted;
  localStream.getVideoTracks().forEach(track => track.enabled = !isVideoMuted);

  const btn = document.getElementById('btn-toggle-cam');
  if (btn) {
    btn.classList.toggle('muted', isVideoMuted);
    btn.innerHTML = isVideoMuted ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
  }

  socket?.emit('media_state_change', { audio: !isAudioMuted, video: !isVideoMuted });
}

// Screen Sharing
async function toggleScreenShare() {
  const btn = document.getElementById('btn-screen-share');

  if (!isScreenSharing) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace track on all peer connections
      peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      document.getElementById('local-video').srcObject = screenStream;
      isScreenSharing = true;
      btn.classList.add('active');

      screenTrack.onended = () => {
        stopScreenSharing();
      };
    } catch (err) {
      console.warn('Screen share cancelled or not allowed:', err);
    }
  } else {
    stopScreenSharing();
  }
}

function stopScreenSharing() {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
  }

  const videoTrack = localStream.getVideoTracks()[0];
  peerConnections.forEach((pc) => {
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender) sender.replaceTrack(videoTrack);
  });

  document.getElementById('local-video').srcObject = localStream;
  isScreenSharing = false;
  document.getElementById('btn-screen-share')?.classList.remove('active');
}
