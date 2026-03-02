# 🛡️ FalconMind

**AI-powered security operations chatbot for the CrowdStrike Falcon platform**

FalconMind lets security analysts, SOC operators, and threat hunters interact with CrowdStrike Falcon using **plain English** — no APIs to memorize, no FQL to write, no documentation to search.

![FalconMind Homepage](docs/homepage.png)

---

## ✨ What It Does

FalconMind connects to your CrowdStrike Falcon tenant and translates natural language queries into real-time API calls, giving you instant answers about your security environment:

| Ask This... | FalconMind Does This |
|---|---|
| *"Show me all open critical detections"* | Queries Alerts v2 API, filters by severity, returns formatted results |
| *"Was hash `abc123...` seen in the last 7 days?"* | Runs a hash hunt across all hosts via alerts |
| *"Contain the host WORKSTATION-42"* | Initiates network containment (with safety confirmation) |
| *"What are our most critical CVEs?"* | Queries Spotlight for vulnerability data |
| *"Look up COZY BEAR threat actor"* | Returns Falcon Intel adversary profile |
| *"Show identity-based detections"* | Queries Identity Protection alerts |
| *"List our custom IOCs"* | Shows all custom indicators of compromise |
| *"Check sensor health"* | Summarizes sensor status across your fleet |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│              Browser (Chat UI)               │
│  Dark theme • Markdown rendering • Quick     │
│  actions sidebar • Model selector            │
└─────────────────┬────────────────────────────┘
                  │ HTTP (localhost:3000)
┌─────────────────▼────────────────────────────┐
│           Express.js Server                   │
│  Session management • Rate limiting           │
│  Request logging • Error handling             │
├───────────────────────────────────────────────┤
│         AI Provider Layer                     │
│  Ollama (local) │ Groq │ Gemini │ OpenAI     │
│  Function calling → Intent Router             │
├───────────────────────────────────────────────┤
│       CrowdStrike Service Layer               │
│  Detections • Incidents • Hosts • Intel       │
│  Spotlight • RTR • IOCs • Identity            │
│  Firewall • Discover • Recon • Workflows      │
├───────────────────────────────────────────────┤
│      CrowdStrike Falcon API (OAuth2)          │
│  Automatic token management & refresh         │
└───────────────────────────────────────────────┘
```

- **All API keys stay server-side** — nothing is sent to the browser
- **OAuth2 tokens** are cached in memory only
- **Destructive actions** (containment, RTR, IOC creation) require explicit confirmation

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **CrowdStrike Falcon** API client credentials ([how to create](#-required-crowdstrike-api-scopes))
- **AI provider** — at least one of:
  - [Ollama](https://ollama.ai/) (recommended — free, local, private)
  - [Groq](https://console.groq.com/keys) (free tier)
  - [Gemini](https://aistudio.google.com/app/apikey) (free tier)
  - [OpenAI](https://platform.openai.com/api-keys) (paid)

### 1. Clone the repository

```bash
git clone https://github.com/parag-samant/FalconMind-Chatbot.git
cd FalconMind-Chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

| Variable | Required | Where to get it |
|---|---|---|
| `AI_PROVIDER` | ✅ | `ollama`, `groq`, `gemini`, or `openai` |
| `CS_CLIENT_ID` | ✅ | Falcon Console → Support → API Clients and Keys |
| `CS_CLIENT_SECRET` | ✅ | Same as above |
| `CS_BASE_URL` | ✅ | Your region's API URL (see `.env.example`) |
| `SESSION_SECRET` | ✅ | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `GROQ_API_KEY` | If using Groq | [console.groq.com/keys](https://console.groq.com/keys) |
| `GEMINI_API_KEY` | If using Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | If using OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |

### 4. (Optional) Set up Ollama for local AI

```bash
# Start Ollama in Docker
docker run -d --name ollama -p 11435:11434 ollama/ollama:latest

# Pull the recommended model
docker exec ollama ollama pull hermes3:latest
```

### 5. Start the server

```bash
npm start         # Production
npm run dev       # Development (auto-restarts on changes)
```

### 6. Open in browser

Navigate to **http://localhost:3000** and start chatting!

---

## 🤖 AI Providers

Switch providers by changing `AI_PROVIDER` in `.env`:

| Provider | Setting | Speed | Cost | Privacy |
|----------|---------|-------|------|---------|
| **Ollama** ⭐ | `ollama` | ~4-60s | Free | 🟢 Fully local |
| **Groq** | `groq` | ~1-3s | Free tier (250 RPD) | 🟡 Cloud |
| **Gemini** | `gemini` | ~2-5s | Free tier | 🟡 Cloud |
| **OpenAI** | `openai` | ~2-5s | Paid | 🟡 Cloud |

---

## 🛡️ API Coverage

| Category | Capabilities |
|---|---|
| **Detections & Alerts** | List, filter, update status, assign |
| **Incidents** | List, investigate, update |
| **Threat Hunting** | Hash hunts, IOC hunts, behavior/TTP searches |
| **Falcon Intelligence** | Threat actors, intel reports, indicator lookups |
| **Host Management** | List, detail, contain, lift containment |
| **Spotlight** | Vulnerability queries, CVE lookups, posture assessment |
| **Real-Time Response** | RTR session management |
| **Custom IOCs** | List, create, manage indicators |
| **Identity Protection** | Identity-based risk and detections |
| **Firewall** | Firewall rule queries |
| **Exposure Management** | Discover unmanaged/shadow IT assets |
| **Recon** | Digital risk monitoring |
| **SOAR / Workflows** | Trigger Fusion workflows |

---

## 📋 Required CrowdStrike API Scopes

Create an API client at **Falcon Console → Support → API Clients and Keys** with these scopes:

| Scope | Access |
|---|---|
| Detections | Read + Write |
| Incidents | Read + Write |
| Hosts | Read + Write |
| Spotlight Vulnerabilities | Read |
| Intel | Read |
| Real-Time Response | Read + Write |
| IOC Manager | Read + Write |
| Identity Protection | Read |
| Firewall Management | Read |
| Discover | Read |
| Recon | Read |
| Workflows | Read + Write |

---

## 🔐 Security Considerations

- **No API keys in the browser** — all CrowdStrike and AI provider calls are server-side only
- **OAuth2 tokens** are cached in server memory — never persisted to disk or sent to the client
- **Destructive operations** (host containment, IOC creation, RTR, workflows) require explicit in-chat confirmation
- **Rate limiting**: 30 req/min on chat, 10 req/min on destructive actions
- **Session secrets** use cryptographically secure random strings
- `.env` is excluded from git via `.gitignore` — credentials are never committed

### For deployments

If deploying to a platform like Heroku, Railway, or Render, configure your secrets as **environment variables** in the platform's dashboard — never commit them to the repo.

---

## 📁 Project Structure

```
FalconMind-Chatbot/
├── config/             # App configuration (reads from env vars)
├── middleware/          # Express middleware (auth, rate limiting, logging)
├── public/             # Frontend (HTML, CSS, JS)
│   ├── css/style.css   # Dark theme UI
│   ├── js/             # Client-side app, markdown, model selector
│   └── index.html      # Main chat interface
├── routes/             # Express routes (chat, status, models, etc.)
├── services/           
│   ├── crowdstrike/    # CrowdStrike API service layer
│   │   ├── auth.js     # OAuth2 token management
│   │   ├── client.js   # Axios HTTP client
│   │   ├── detections.js
│   │   ├── hosts.js
│   │   ├── intel.js
│   │   └── ...         # All 12+ API service modules
│   ├── gemini/         # Gemini AI provider
│   ├── ollama/         # Ollama AI provider  
│   └── openai/         # OpenAI/Groq provider + function definitions
├── tests/              # Jest test suite
├── utils/              # FQL sanitizer, intent router, system prompts
├── server.js           # Express server entry point
├── .env.example        # Template for environment variables
└── package.json
```

---

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

---

## 📝 License

MIT

---

## 🙏 Acknowledgements

- [CrowdStrike Falcon](https://www.crowdstrike.com/) — Endpoint security platform
- [Ollama](https://ollama.ai/) — Local LLM runtime
- [Groq](https://groq.com/) — Fast AI inference
- [Google Gemini](https://ai.google.dev/) — Multimodal AI
- [OpenAI](https://openai.com/) — GPT models

---

*Built with ❤️ for security analysts who'd rather ask questions than write FQL.*
