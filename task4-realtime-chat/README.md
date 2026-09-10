# CodeAlpha_RealTime_Communication_App

A full-stack, real-time video conferencing, collaborative digital whiteboard, and instant messaging application built for the **CodeAlpha Full Stack Development Internship (Task 4)**.

![Project Banner](https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=1200&auto=format&fit=crop&q=80)

---

## 🌟 Key Features

1. **Multi-Peer Video & Audio Conferencing (WebRTC)**:
   - Mesh WebRTC audio/video calling using Google STUN signaling servers.
   - Dynamic video grid adapting automatically to the number of participants.
   - Fallback video stream simulation for headless or virtual environments.

2. **Screen Sharing**:
   - One-click screen broadcasting using the browser's native `DisplayMedia` API.
   - Real-time video track swapping on all active peer connections.

3. **Collaborative Digital Whiteboard**:
   - Real-time canvas broadcasting drawing strokes across all peers via Socket.IO.
   - Multiple brush colors, configurable stroke widths, eraser tool, and full canvas clear.
   - One-click PNG whiteboard export/download for meeting notes.

4. **In-Meeting Chat & Ephemeral Messaging**:
   - Real-time text messaging with sender badges, timestamps, and encryption status indicators.

5. **Peer-to-Peer File Sharing**:
   - Instant file transmission (documents, images, code files, archives up to 25MB).
   - One-click direct download for meeting participants.

6. **Room Security & Access Control**:
   - Unique generated room codes (`alpha-xxxxxx`).
   - PIN passcode protection for private conference sessions.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5 Canvas, Modern CSS3 (Dark theme, Glassmorphism, CSS Grid), Vanilla JavaScript (WebRTC APIs, MediaDevices API, Socket.IO client).
- **Backend**: Node.js, Express.js, Socket.IO.
- **Protocols**: WebRTC (Mesh topology), WebSockets (Full-duplex signaling).

---

## 🚀 Getting Started

### 1. Installation

```bash
cd CodeAlpha_RealTime_Communication_App
npm install
```

### 2. Start the Server

```bash
npm start
# Or
node server.js
```

The application will run on:
👉 **`http://localhost:3004`**

---

## 💻 How to Test Multi-User Video & Whiteboard
1. Open `http://localhost:3004` in your browser.
2. Enter your name (e.g., "Alice") and click **Start Instant Meeting**.
3. Copy the room invite URL from the top bar.
4. Open a second browser window (or Incognito tab) and paste the URL.
5. Enter a second name (e.g., "Bob") and join.
6. Test live video calling, toggle the **Collaborative Whiteboard** and draw in real-time, share files, and send chat messages!

---

## 📁 Repository Structure

```
CodeAlpha_RealTime_Communication_App/
├── server.js             # Express + Socket.IO WebRTC signaling engine
├── package.json          # Dependencies & scripts
├── public/
│   ├── index.html        # Meeting lobby & room creator
│   ├── room.html         # Conference stage with video grid & whiteboard
│   ├── css/
│   │   └── style.css     # Glassmorphism dark conference UI
│   └── js/
│       ├── app.js        # Lobby logic & meeting coordinator
│       ├── webrtc.js     # WebRTC mesh & stream management
│       ├── whiteboard.js # Canvas drawing & stroke broadcasting
│       └── chat.js       # Live chat & file sharing
└── README.md
```

---

## 🎓 CodeAlpha Internship Verification
- **Task**: Task 4 - Real-Time Communication App
- **Domain**: Full Stack Development
- **GitHub Repository**: `CodeAlpha_RealTime_Communication_App`
