# Ami by Rupeezy

AI-powered relationship manager and lead analytics platform for the Rupeezy Authorized Person (AP) Partner Program.

Ami is designed to help brokerage teams automate partner engagement, qualify leads intelligently, track relationship signals, and provide multilingual conversational support using AI.

---

## Features

### AI Relationship Manager

* Conversational AI assistant
* Real-time streaming responses
* Human-like multilingual interactions
* Adaptive conversational flow

### Lead Intelligence System

* Automatic lead qualification
* Hot / Warm / Cold categorization
* Trust score analysis
* Emotional engagement scoring
* Interest-level tracking
* Objection analysis

### Analytics Dashboard

* Live lead insights
* Lead distribution analytics
* Language preference tracking
* Conversation monitoring
* Relationship pulse system

### Multilingual Support

Supports:

* English
* Hindi
* Hinglish
* Marathi

### Modern UI/UX

* Responsive dashboard
* Real-time chat interface
* TailwindCSS-powered design
* Clean analytics visualization

---

# Tech Stack

## Frontend

* React
* TypeScript
* TailwindCSS
* TanStack Query
* Wouter
* Lucide Icons

## Backend

* Express.js
* TypeScript
* Drizzle ORM
* OpenAI API Integration

## AI Features

* Streaming AI responses
* Lead analysis engine
* Sentiment + intent classification
* Relationship scoring system

---

# Project Structure

```txt
ami-by-rupeezy/
│
├── artifacts/
│   ├── ami/                 # Frontend application
│   └── api-server/          # Backend API server
│
├── src/
├── components/
├── pages/
├── routes/
│
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── .gitignore
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/AyushiShukla19/ami-project.git
cd ami-project
```

---

# Install Dependencies

Using pnpm:

```bash
pnpm install
```

---

# Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_database_url
PORT=3000
```

---

# Run Development Server

## Frontend

```bash
pnpm dev
```

## Backend

```bash
pnpm start
```

---

# AI Lead Qualification Logic

Ami automatically analyzes conversations and generates:

| Metric               | Description                        |
| -------------------- | ---------------------------------- |
| Trust Score          | Measures user confidence           |
| Interest Level       | Measures purchase/join intent      |
| Emotional Engagement | Measures conversational engagement |
| Lead Status          | Hot / Warm / Cold classification   |
| Objections Raised    | Detects hesitation or concerns     |
| Recommendation       | Suggested next action              |

---

# Example Use Cases

* Brokerage partner onboarding
* AI sales assistant
* Financial relationship management
* CRM augmentation
* Lead intelligence platform
* AI-powered support systems

---

# Security

Sensitive information such as:

* API keys
* tokens
* secrets
* credentials

should never be committed to the repository.

Use:

```bash
.env
```

and ensure `.gitignore` is configured correctly.

---

# Roadmap

* [ ] CRM integrations
* [ ] WhatsApp integration
* [ ] Voice assistant support
* [ ] Real-time RM handoff
* [ ] Advanced analytics
* [ ] Mobile application
* [ ] Docker deployment
* [ ] Kubernetes support

---

# Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push your branch
5. Open a Pull Request

---

# License

This project is licensed under the MIT License.

---

# Acknowledgements

Built using:

* React
* Express
* TailwindCSS
* OpenAI APIs
* Drizzle ORM

---

# Disclaimer

This project is intended for educational, experimental, and business automation purposes.

Always ensure compliance with:

* financial regulations
* data privacy laws
* AI governance policies
* SEBI guidelines (if deployed commercially in India)
