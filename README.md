# 🎛️ LOCUS CONTROL - EchoHouse DJ Mixing & Broadcasting Studio

<div align="center">

![Locus Control](https://img.shields.io/badge/LOCUS-CONTROL-00ff41?style=for-the-badge&logo=react&color=black)
![Version](https://img.shields.io/badge/VERSION-1.5-00ff41?style=for-the-badge&color=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**Professional-grade DJ mixing, projection mapping, and broadcast control suite**

</div>

---

## 🚀 Features

### 🎚️ DJ Mixer (Audio Matrix)
- **24 Channel Strips** with full control
- **3-Band EQ** per channel (High/Mid/Low)
- **Gain, Mute, Solo, Cue** controls
- **Crossfader** with A/B bus assignment
- **Master Compressor** with threshold/ratio
- **Real-time VU Meters** with color-coded levels
- **Recording** to WebM/Opus format

### 🎛️ Effects Rack
- **Filter**: Lowpass/Highpass/Allpass with resonance
- **Distortion**: Bitcrush/waveshaper
- **Delay**: Time, feedback, dry/wet mix
- **Master Limiter**: Safety ceiling at -0.1dB

### 🎥 Projection Mapping Suite
- **Multi-Window Output**: Launch unlimited projection windows
- **Keystone Correction**: Rotate X/Y, scale, perspective
- **Audio-Reactive Visuals**: Starfield, grids, FFT spectrum
- **Video Sources**: Reactive backgrounds, screen capture, math engine
- **Real-time Sync**: 60fps postMessage sync to all windows

### 💡 LED/DMX Lighting Control
- **Web Serial API** support for LED strips
- **4 Lighting Modes**:
  - VU Meter (green→yellow→red)
  - FFT Spectrum (rainbow frequency display)
  - Rave Strobe (beat-reactive flashes)
  - Ambiance Match (smooth hue following)
- **30fps Serial Output** to hardware

### 🎮 Hercules DJ Controller Support
**Auto-detects and configures:**
- DJControl Inpulse 500/300/200
- DJControl Starlight
- DJControl Compact
- DJControl Air (with air sensor)
- DJControl Jogvision
- Generic Hercules fallback

**Hardware Mappings:**
- Volume faders → Channel levels
- Crossfader → A/B mix
- EQ knobs → 3-band filter
- CUE/PLAY buttons → Monitor/Mute with LED feedback
- Jog wheels → Scratch/pitch bend
- VU meters → Hardware LED meters (if supported)

### 🌐 Network/Mesh Broadcasting
- **WebSocket** real-time communication
- **UDP Multicast** discovery (simulated)
- **Node Fleet Management**: Connect multiple clients
- **Latency Monitoring**: Per-node telemetry

### 💾 Scene Management
- **Save/Load** complete studio state
- **Audio**: Volumes, mutes, solos, FX settings
- **Projection**: Surface layouts, keystone settings
- **Lighting**: LED mode, brightness
- **Export/Import** JSON scenes

---

## 🖥️ System Requirements

| Component | Requirement |
|-----------|-------------|
| **Browser** | Chrome/Edge/Firefox (latest) |
| **Audio** | Web Audio API support |
| **MIDI** | Web MIDI API (for DJ controllers) |
| **Serial** | Web Serial API (for LED control) |
| **Display** | 1920x1080 recommended |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set your Gemini API key (for AI features)
echo "VITE_GEMINI_API_KEY=your_key_here" > .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎮 Using Your Hercules DJ Controller

1. **Plug in** your Hercules controller via USB
2. **Open** Locus Control in browser
3. **Allow** MIDI access when prompted
4. **Auto-detection** will identify your model and configure mappings
5. **LEDs** will sync with app state automatically

**Controller Status** shows in top-right of Audio Matrix panel:
- Green = Connected
- Shows model name + features [RGB] [VU] [JOG]
- Last input displayed in real-time

---

## 🎛️ Audio Routing

```
[Input Sources] → [Channel Strips] → [Buses A/B] → [Crossfader]
                                                      ↓
[FX Chain: Filter → Distortion → Delay] → [Compressor] → [Master Out]
                                                              ↓
                                                    [Monitor/Cue] + [Record]
```

---

## 🎥 Projection Setup

1. Click **Projection** tab
2. Click **LAUNCH PROJECTOR** to open output window(s)
3. Position windows on external displays/projectors
4. Adjust **keystone/scale/position** per surface
5. Select **video source** (visuals/screen/math)
6. Enable **audio binding** for reactive effects

---

## 💡 LED Strip Setup

1. Connect LED controller via USB Serial
2. Click **Lighting Link** tab
3. Click **CONNECT DEVICE**
4. Select mode: VU / Spectrum / Rave / Ambiance
5. Adjust pixel count and brightness

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT UI LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Audio   │ │  Video   │ │  Network │ │  Scenes  │       │
│  │  Matrix  │ │  Output  │ │  Status  │ │  Manager │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   CONTEXT PROVIDERS                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Audio   │ │ Hardware │ │  Network │ │  Scene   │       │
│  │ Context  │ │ Context  │ │ Context  │ │ Context  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Audio   │ │   DJ     │ │  Network │ │  Storage │       │
│  │  Engine  │ │Controller│ │  Mesh    │ │  Service │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   HARDWARE ABSTRACTION                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ WebAudio │ │ Web MIDI │ │ WebSerial│ │ WebSocket│       │
│  │   API    │ │   API    │ │   API    │ │   API    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Web Audio API** - Audio Processing
- **Web MIDI API** - DJ Controller Support
- **Web Serial API** - LED Hardware
- **WebSocket** - Network Communication
- **Canvas API** - Visualizations

---

## 📝 License

MIT License - Do whatever you want with this.

---

<div align="center">

**Built for the underground. Play loud.** 🔊

</div>
