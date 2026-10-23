# 🏫 UNOOCC — Room Availability Assistant

> **Smart Classroom & Laboratory Availability Tracker**
> A mobile-first React app that helps college students find free classrooms on campus in real-time.

---

## ✨ Features

- **Natural-language search** — ask "Which rooms are free right now?" or "Labs open after 2 PM"
- **Quick-action chips** — one-tap filters for "Free right now", "Ground floor", "1st floor", "2nd floor"
- **Formatted responses** — the agent's prose is rendered with bullet points, colored availability highlights (green = free all day, amber = limited time)
- **Dark / Light mode** — toggles with one tap, persists your preference
- **Loading & error states** — spinner while waiting, retry button on failure
- **Mobile-first, responsive** — designed for quick phone scanning between classes

## 🛠 Tech Stack

| Layer      | Technology                     |
|------------|--------------------------------|
| Framework  | React 19 (functional + hooks)  |
| Build      | Vite 8                         |
| Styling    | Tailwind CSS v4 (Vite plugin)  |
| Typography | Inter (Google Fonts)           |
| Backend    | External n8n webhook (no own server) |

## 📁 Project Structure

```
src/
├── components/
│   ├── Header.jsx          # App name, subtitle, theme toggle
│   ├── SearchBar.jsx        # Input field, send button, quick-action chips
│   ├── ResultsArea.jsx      # Formatted agent response display
│   ├── LoadingSpinner.jsx   # Animated loading indicator
│   ├── ErrorBanner.jsx      # Error message with retry button
│   └── EmptyState.jsx       # Initial state with prompt text
├── hooks/
│   └── useTheme.js          # Dark/light mode hook with localStorage
├── services/
│   └── api.js               # Webhook fetch with timeout & error handling
├── config.js                # ⬅ Set your WEBHOOK_URL here
├── App.jsx                  # Main app shell
├── main.jsx                 # Entry point
└── index.css                # Tailwind + custom theme + animations
```

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-username/UNOOCC-Smart-Classroom-Availability-Tracker.git
cd UNOOCC-Smart-Classroom-Availability-Tracker
npm install
```

### 2. Set your webhook URL

Open **`src/config.js`** and replace the placeholder:

```js
export const WEBHOOK_URL = "https://YOUR_N8N_INSTANCE.app.n8n.cloud/webhook/YOUR_WEBHOOK_ID";
```

The app sends a `POST` request with:
```json
{ "question": "Which rooms are free right now?" }
```

And expects:
```json
{ "output": "Here are the free rooms:\n- Room 101 (Ground Floor) — Free until 2:30 PM\n- Room 205 (2nd Floor) — Free for the rest of the day" }
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for production

```bash
npm run build
npm run preview
```

## 🎨 Design

- **Warm campus palette** — coral/orange accent on light neutral background
- **Dark mode** — deep neutral tones with muted coral accents
- **Typography** — Inter font, sized for quick phone scanning
- **Micro-animations** — fade-in, stagger, pulse for a premium feel
- **Rounded cards, soft shadows** — modern glassmorphism-adjacent aesthetic

## 📄 License

MIT
