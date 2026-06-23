# EquiSight — AI Equity Research Platform

A production-quality multi-agent AI system that conducts comprehensive equity research using LangGraph and Gemini 2.5 Flash. Built as a capstone project for the **Multi-Agent Orchestration [AI/ML]** course.

---

## Architecture

Five specialized AI agents collaborate in a LangGraph pipeline:

```
Company Research → Financial Analysis → News Sentiment → Risk Analysis
                                                              │
                                              ┌───────────────┴───────────────┐
                                         risk > 75                      risk ≤ 75
                                              │                               │
                                       High Risk Review            Investment Committee
                                              └───────────────┬───────────────┘
                                                              │
                                                    Human Approval (HITL)
                                                              │
                                                       PDF Report
```

| Agent | Role | Output |
|-------|------|--------|
| **Company Research** | Fetches and summarizes company profile | sector, industry, market cap, business summary |
| **Financial Analysis** | Scores financial health | financial score (0–100), strengths, weaknesses |
| **News Sentiment** | Analyzes recent news via Tavily | sentiment (positive/neutral/negative), score, headlines |
| **Risk Analysis** | Synthesizes all data into risk profile | risk level (low/medium/high), risk score (0–100) |
| **Investment Committee** | Renders final decision | BUY / HOLD / SELL, confidence, reasoning |

**Conditional routing:** if `risk_score > 75`, the workflow routes through a High Risk Review node before the Investment Committee.

**Human-in-the-loop:** the graph pauses after the Investment Committee decision — a human must approve before the PDF report is generated.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Gemini 2.5 Flash |
| Orchestration | LangGraph |
| Finance Data | yfinance |
| News Search | Tavily Search API |
| PDF Generation | ReportLab |
| Backend | FastAPI |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Observability | LangSmith |

---

## Project Structure

```
ai-equity-research/
├── backend/
│   ├── agents/
│   │   ├── company_research.py
│   │   ├── financial_analysis.py
│   │   ├── news_sentiment.py
│   │   ├── risk_analysis.py
│   │   └── investment_committee.py
│   ├── graph/
│   │   ├── state.py          # Shared ResearchState Pydantic model
│   │   ├── nodes.py          # LangGraph node wrappers
│   │   └── workflow.py       # Graph definition + conditional routing
│   ├── tools/
│   │   ├── finance_tool.py   # yfinance integration
│   │   ├── news_tool.py      # Tavily Search integration
│   │   └── pdf_tool.py       # ReportLab PDF generation
│   ├── api/
│   │   └── routes.py         # FastAPI endpoints
│   ├── evaluation/
│   │   └── test_cases.py     # 5 test cases with LangSmith evaluation
│   └── main.py
├── frontend/
│   └── src/
│       ├── app/              # Next.js App Router pages
│       └── lib/              # API client + utilities
├── requirements.txt
└── .env.example
```

---

## Setup

### 1. Clone & install dependencies

```bash
git clone https://github.com/shreyas-garg/EquiSight.git
cd EquiSight

pip install -r requirements.txt

cd frontend && npm install && cd ..
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

| Variable | Where to get it |
|----------|----------------|
| `GOOGLE_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key (starts with `AIzaSy...`) |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) |
| `LANGCHAIN_API_KEY` | [smith.langchain.com](https://smith.langchain.com) |

### 3. Run

```bash
# Backend (from project root)
python3 -m uvicorn backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/research` | Start research for a ticker `{"ticker": "AAPL"}` |
| `POST` | `/api/approve` | Approve/reject to trigger PDF generation |
| `GET` | `/api/report/{run_id}` | Download the generated PDF report |
| `GET` | `/api/status/{run_id}` | Get full research results |
| `GET` | `/health` | Health check |

---

## Evaluation

Run the evaluation suite against 5 test tickers (AAPL, MSFT, NVDA, TSLA, AMZN):

```bash
python3 -m backend.evaluation.test_cases
```

Evaluates:
- **Output completeness** — all required fields present and valid
- **Guardrail compliance** — no financial guarantees or prohibited language
- **Conditional routing accuracy** — high-risk path triggered correctly

Results are saved to `evaluation_results_<timestamp>.json` and traced in LangSmith.

---

## Guardrails

- Rejects requests containing financial guarantee language
- Investment Committee agent checks output for prohibited phrases before returning
- Every recommendation includes a mandatory disclaimer
- No price targets or guaranteed returns are generated

---

## Team

Built for the Multi-Agent Orchestration [AI/ML] capstone — evaluation June 25–30, 2026.
