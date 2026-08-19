# V-Chat — 1:1 WebRTC Video Chat Platform (Omegle & OmeTV Clone)

A modern, high-performance, and safety-focused 1:1 stranger video chat application built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **WebRTC**, and **Firebase**.

![V-Chat Architecture](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![WebRTC](https://img.shields.io/badge/WebRTC-Peer_to_Peer-orange?style=flat&logo=webrtc)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## ✨ Features

- 📹 **Live 1:1 WebRTC Video Stream**: End-to-end peer connections with Google STUN + dynamic TURN relay.
- 🌍 **OmeTV Style Country Filters**: Match with strangers from specific countries or worldwide.
- ⚧ **Gender Matching**: Filter matching preferences by gender.
- 👤 **Account System & Profiles**:
  - Email & Password registration + login with secure hashing.
  - Custom bot avatar selection, bio, country, gender, and karma stats.
  - Seamless guest mode fallback with auto-account migration.
- 🛡️ **Safety, Moderation & 18+ Age Gate**:
  - Enforced age verification gate with server-side validation.
  - Real-time text toxicity scoring and message filtering via Google Perspective API.
  - Instant fixed-choice player reporting with automatic ban & strike enforcement.
- 🎨 **Industrial Dark Design System**:
  - Curated `#0D0D0F` dark canvas with `#FF4B2B` accent.
  - Floating, draggable self-view tile with physics boundaries.
  - 3-second auto-fading controls on mouse idle.
- 🎉 **Live Emoji Reactions**: Floating animated particle reactions (❤️, 🔥, 😂, 👏, 😮, 🚫).
- 🔊 **Web Audio Synthesizer**: Built-in sound effects for connect, skip, messages, and reactions.
- 📜 **Recent Encounters History**: View past connection records and timestamps.
- ⚖️ **Legal & Guidelines Pages**: Draft Terms of Service & Community Safety Guidelines.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/shubhamsalot/v-chat.git
cd v-chat
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. Open a second tab or incognito window to test 1:1 matchmaking in real-time.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Real-Time Video**: [WebRTC](https://webrtc.org/) (RTCPeerConnection, STUN/TURN)
- **Moderation**: Google Perspective API
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio**: Web Audio API Procedural Synthesizer

---

## 📄 License
MIT License.
