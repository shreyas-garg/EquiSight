<div align="center">

# EquiSight

### Institutional-grade equity research, delivered in seconds.

A production-quality **multi-agent AI system** that conducts comprehensive stock research — analyzing fundamentals, financials, news sentiment, and risk — then surfaces a committee-grade **BUY / HOLD / SELL** decision with full reasoning and a downloadable PDF report.

Built as a capstone project for the **Multi-Agent Orchestration [AI/ML]** course.

![Stack](https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-blue?style=flat-square)
![Stack](https://img.shields.io/badge/Orchestration-LangGraph-orange?style=flat-square)
![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square)
![Stack](https://img.shields.io/badge/Observability-LangSmith-purple?style=flat-square)

</div>

---

## What It Does

Enter any stock ticker. Five specialized AI agents spin up in sequence, each doing one job with precision:

1. **Company Research** — scrapes SEC filings, Wikipedia, and the web to build a full company profile
2. **Financial Analysis** — pulls live market data via yfinance and scores financial health 0–100
3. **News Sentiment** — fetches recent headlines and runs NLP sentiment analysis
4. **Risk Assessment** — evaluates macro, regulatory, and competitive risk; flags high-risk stocks for mandatory review
5. **Investment Committee** — a Gemini 2.5-powered committee synthesizes everything and votes BUY / HOLD / SELL

A human must **approve the decision** before a PDF report is generated — enforcing human-in-the-loop accountability at every analysis.

---

## Pipeline Architecture

```
                        ┌─────────────────────────────────┐
                        │         LangGraph Pipeline       │
                        └─────────────────────────────────┘

  [Company Research] ──► [Financial Analysis] ──► [News Sentiment] ──► [Risk Assessment]
                                                                               │
                                                              ┌────────────────┴────────────────┐
                                                         risk_score > 75               risk_score ≤ 75
                                                              │                                  │
                                                     [High Risk Review]                          │
                                                              └────────────────┬────────────────┘
                                                                               │
                                                                  [Investment Committee]
                                                                               │
                                                                   ◉ INTERRUPT — HITL Gate
                                                                               │
                                                                    Human Approves / Rejects
                                                                               │
                                                                        [PDF Report]
```

**Conditional routing** — if `risk_score > 75`, the pipeline automatically routes through a High Risk Review node before the final committee vote.

**Human-in-the-loop** — the LangGraph graph pauses at `interrupt_before=["human_approval"]`. No report is generated without explicit human sign-off.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| LLM | Gemini 2.5 Flash (+ Flash-Lite fallback) | All agent reasoning |
| Orchestration | LangGraph + MemorySaver | Stateful multi-agent pipeline with HITL |
| Observability | LangSmith | Full trace visibility per run |
| Finance Data | yfinance | Live market data, financials, price history |
| News & Web | Tavily Search API | Real-time news and web research |
| PDF Generation | ReportLab | Structured equity research reports |
| Backend | FastAPI | REST API with 5 endpoints |
| Frontend | Next.js 15, TypeScript, Tailwind CSS | Terminal-style research UI |
| Charts | TradingView Widgets | Live stock charts and ticker tape |

---

## Features

- **Live stock sparklines** on the landing page with real 30-day price data
- **TradingView live chart** embedded in the analysis review panel
- **Expandable agent cards** — click any pipeline step to see what it does, what tools it uses, and what it outputs
- **BUY / HOLD / SELL verdict** with confidence %, full reasoning, key drivers, and risk factors
- **Conditional high-risk routing** — stocks scoring above 75 risk trigger an extra review node
- **Human approval gate** — analysis pauses and waits for explicit human sign-off before generating the PDF
- **Downloadable PDF report** compiled by ReportLab with the full research output
- **URL-based navigation** — back/forward browser buttons work correctly across all phases
- **Model fallback chain** — automatically falls back across `gemini-2.5-flash-lite → gemini-2.5-flash → gemini-2.0-flash` on quota errors
- **LangSmith tracing** — every agent call is traced and visible in LangSmith dashboard
- **Input guardrails** — rejects requests containing financial guarantee language; every recommendation includes a mandatory disclaimer

---

## Project Structure

```
ai-equity-research/
├── backend/
│   ├── agents/
│   │   ├── _llm.py                  # Shared LLM factory with retry + model fallback
│   │   ├── company_research.py      # Agent 1: company profile
│   │   ├── financial_analysis.py    # Agent 2: financial scoring
│   │   ├── news_sentiment.py        # Agent 3: sentiment analysis
│   │   ├── risk_analysis.py         # Agent 4: risk scoring + high-risk flag
│   │   └── investment_committee.py  # Agent 5: BUY/HOLD/SELL decision
│   ├── graph/
│   │   ├── state.py                 # ResearchState — shared Pydantic model
│   │   ├── nodes.py                 # LangGraph node wrappers per agent
│   │   └── workflow.py              # Graph definition, conditional routing, HITL
│   ├── tools/
│   │   ├── finance_tool.py          # yfinance integration (numpy-safe)
│   │   ├── news_tool.py             # Tavily Search integration
│   │   └── pdf_tool.py              # ReportLab PDF generation
│   ├── api/
│   │   └── routes.py                # FastAPI endpoints
│   ├── evaluation/
│   │   └── test_cases.py            # Evaluation suite — 5 tickers, 3 metrics
│   └── main.py
├── frontend/
│   └── src/
│       ├── app/
│       │   └── page.tsx             # Single-page app with URL-based routing
│       └── lib/
│           ├── api.ts               # Typed API client
│           └── utils.ts
├── requirements.txt
└── .env.example
```

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/shreyas-garg/EquiSight.git
cd EquiSight

pip install -r requirements.txt

cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your keys:

| Variable | Where to get it |
|---|---|
| `GOOGLE_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) |
| `LANGCHAIN_API_KEY` | [smith.langchain.com](https://smith.langchain.com) |

### 3. Run

```bash
# Terminal 1 — backend
python3 -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| LangSmith Traces | https://smith.langchain.com |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/research` | Start a research run `{"ticker": "AAPL"}` |
| `POST` | `/api/approve` | Approve or reject to trigger PDF generation |
| `GET` | `/api/status/{run_id}` | Get full research results and scores |
| `GET` | `/api/report/{run_id}` | Download the generated PDF report |
| `GET` | `/api/prices/{ticker}` | 30-day price history for sparkline charts |
| `GET` | `/health` | Health check |

---

## Evaluation

Run the evaluation suite against 5 test tickers:

```bash
python3 -m backend.evaluation.test_cases
```

Evaluates:
- **Output completeness** — all required fields present and valid types
- **Guardrail compliance** — no financial guarantees or prohibited language in output
- **Conditional routing accuracy** — high-risk path correctly triggered when `risk_score > 75`

Results are saved to `evaluation_results_<timestamp>.json` and fully traced in LangSmith.

---

## Guardrails & Safety

- Input validation rejects requests containing financial guarantee language (`"guaranteed return"`, `"risk-free"`, `"will definitely"`, etc.)
- Investment Committee agent checks its own output for prohibited phrases before returning
- Every recommendation includes a mandatory disclaimer
- No price targets or guaranteed returns are ever generated
- Human approval is required before any report is produced — the pipeline cannot auto-complete

---

<div align="center">

Built with LangGraph · Gemini 2.5 · FastAPI · Next.js 15

</div>
