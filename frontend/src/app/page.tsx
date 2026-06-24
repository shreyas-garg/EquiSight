"use client";

import { useState, useEffect } from "react";
import {
  startResearch, approveResearch, getStatus, getReportUrl,
  type ResearchResponse, type StatusResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  XCircle, FileText, Search, BarChart2, Newspaper, Shield,
  Users, Download, Activity, ChevronRight, ChevronDown, Globe,
  Brain,
} from "lucide-react";

type AppState =
  | { phase: "idle" }
  | { phase: "loading"; ticker: string }
  | { phase: "review"; data: ResearchResponse; status: StatusResponse }
  | { phase: "generating" }
  | { phase: "done"; runId: string }
  | { phase: "error"; message: string };

const AGENT_STEPS = [
  {
    label: "Company Research",
    icon: Globe,
    color: "#60a5fa",
    description: "Scrapes SEC filings, company website, and Wikipedia to build a full company profile including business model, sector, and competitive moat.",
    tools: ["Web Search", "SEC EDGAR", "Tavily API"],
    output: "Company profile, business summary, sector classification",
  },
  {
    label: "Financial Analysis",
    icon: BarChart2,
    color: "#34d399",
    description: "Pulls live market data via yfinance — P/E ratio, revenue growth, margins, debt levels — and computes a 0–100 financial health score.",
    tools: ["yfinance", "Financial ratios", "Trend analysis"],
    output: "Financial score, strengths, weaknesses, key metrics",
  },
  {
    label: "News Sentiment",
    icon: Newspaper,
    color: "#f59e0b",
    description: "Fetches recent news articles and earnings call transcripts, then runs NLP sentiment analysis to gauge market mood and narrative momentum.",
    tools: ["Tavily Search", "NLP Sentiment", "News APIs"],
    output: "Sentiment score (0–100), key headlines, tone classification",
  },
  {
    label: "Risk Assessment",
    icon: Shield,
    color: "#f87171",
    description: "Evaluates macro risks, regulatory exposure, concentration risk, and competitive threats. Scores 0–100; scores above 75 trigger a mandatory high-risk human review.",
    tools: ["Risk models", "Regulatory DB", "Macro indicators"],
    output: "Risk score, risk factors list, high-risk flag if score > 75",
  },
  {
    label: "Committee Decision",
    icon: Brain,
    color: "#a78bfa",
    description: "A simulated investment committee powered by Gemini 2.5 synthesizes all prior agent outputs and votes BUY / HOLD / SELL with a confidence percentage and full reasoning.",
    tools: ["Gemini 2.5 Flash", "LangGraph", "HITL Approval"],
    output: "BUY / HOLD / SELL verdict, confidence %, reasoning, key drivers",
  },
];

const QUICK_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPCX"];

// ── Real price sparkline ──────────────────────────────────────────────────────
function Sparkline({ closes, color, id }: { closes: number[]; color: string; id: string }) {
  const w = 300, h = 70;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes
    .map((v, i) => `${(i / (closes.length - 1)) * w},${h - ((v - min) / range) * h * 0.9 - h * 0.05}`)
    .join(" L ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${pts} L ${w},${h} L 0,${h} Z`} fill={`url(#sg-${id})`} />
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StockCard({ ticker }: { ticker: string }) {
  const [data, setData] = useState<{ closes: number[]; change_pct: number } | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/prices/${ticker}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, [ticker]);

  const price = data ? data.closes[data.closes.length - 1] : null;
  const change = data?.change_pct ?? 0;
  const color = change >= 0 ? "#34d399" : "#f87171";

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-all hover:bg-white/5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-white">{ticker}</p>
          <p className="text-[11px] text-white/30">30-day</p>
        </div>
        <div className="text-right">
          {price != null
            ? <p className="text-sm font-bold text-white">${price.toFixed(2)}</p>
            : <div className="h-5 w-14 bg-white/5 rounded animate-pulse" />}
          {data
            ? <p className={cn("text-[11px] font-medium", change >= 0 ? "text-emerald-400" : "text-red-400")}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}%
              </p>
            : <div className="h-4 w-10 bg-white/5 rounded animate-pulse mt-0.5 ml-auto" />}
        </div>
      </div>
      <div className="h-14">
        {data
          ? <Sparkline closes={data.closes} color={color} id={ticker} />
          : <div className="h-full bg-white/3 rounded animate-pulse" />}
      </div>
    </div>
  );
}

// ── TradingView widgets ───────────────────────────────────────────────────────
function TradingViewChart({ ticker }: { ticker: string }) {
  useEffect(() => {
    const el = document.getElementById("tv-chart");
    if (!el) return;
    el.innerHTML = "";
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize: true, symbol: ticker, interval: "D",
      timezone: "Etc/UTC", theme: "dark", style: "1", locale: "en",
      backgroundColor: "rgba(15,17,23,1)",
      gridColor: "rgba(255,255,255,0.04)",
      hide_top_toolbar: false, hide_legend: false,
      save_image: false, calendar: false,
    });
    el.appendChild(s);
  }, [ticker]);

  return (
    <div className="tradingview-widget-container h-full">
      <div id="tv-chart" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

function TickerTape() {
  useEffect(() => {
    const el = document.getElementById("ticker-tape");
    if (!el || el.childElementCount > 0) return;
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbols: [
        { proName: "NASDAQ:AAPL" }, { proName: "NASDAQ:MSFT" },
        { proName: "NASDAQ:NVDA" }, { proName: "NASDAQ:TSLA" },
        { proName: "NASDAQ:AMZN" }, { proName: "NASDAQ:GOOGL" },
        { proName: "NASDAQ:META" }, { proName: "NYSE:RKLB" },
      ],
      showSymbolLogo: true, isTransparent: true,
      displayMode: "adaptive", colorTheme: "dark", locale: "en",
    });
    el.appendChild(s);
  }, []);

  return (
    <div id="ticker-tape" className="tradingview-widget-container border-b border-white/5" style={{ height: 46 }} />
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Expandable agent card for sidebar ────────────────────────────────────────
function AgentCard({ step, index, done, active }: {
  step: typeof AGENT_STEPS[0]; index: number; done: boolean; active: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(
      "rounded-lg border transition-all overflow-hidden mb-1",
      open ? "border-white/15 bg-white/5" : "border-transparent",
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-left group"
      >
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors",
          done ? "bg-emerald-400" : active ? "bg-blue-400 animate-pulse" : "bg-white/10"
        )} />
        <span className={cn("text-[11px] flex-1 transition-colors",
          done ? "text-emerald-400" : active ? "text-blue-300" : "text-white/30 group-hover:text-white/60"
        )}>
          {step.label}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 flex-shrink-0 transition-transform text-white/20",
          open && "rotate-180"
        )} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          <p className="text-[11px] text-white/50 leading-relaxed mb-2">{step.description}</p>
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Tools</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {step.tools.map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/8 text-white/40">{t}</span>
            ))}
          </div>
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Output</p>
          <p className="text-[11px] text-white/40">{step.output}</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [ticker, setTicker] = useState("");
  const [appState, setAppState] = useState<AppState>({ phase: "idle" });
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setAppState({ phase: "loading", ticker: t });
    setCurrentStep(0);
    const iv = setInterval(() => setCurrentStep(s => s < AGENT_STEPS.length - 1 ? s + 1 : s), 8000);
    try {
      const research = await startResearch(t);
      clearInterval(iv);
      setCurrentStep(AGENT_STEPS.length);
      const status = await getStatus(research.run_id);
      setAppState({ phase: "review", data: research, status });
    } catch (err) {
      clearInterval(iv);
      setAppState({ phase: "error", message: err instanceof Error ? err.message : "Research failed" });
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (appState.phase !== "review") return;
    const runId = appState.data.run_id;
    if (!approved) { setAppState({ phase: "idle" }); setTicker(""); return; }
    setAppState({ phase: "generating" });
    try {
      await approveResearch(runId, true);
      setAppState({ phase: "done", runId });
    } catch (err) {
      setAppState({ phase: "error", message: err instanceof Error ? err.message : "Report generation failed" });
    }
  };

  const reset = () => { setAppState({ phase: "idle" }); setTicker(""); setCurrentStep(0); };

  const rec = appState.phase === "review" ? appState.data.recommendation.recommendation : null;
  const recMeta = {
    BUY:  { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  icon: <TrendingUp className="w-5 h-5" /> },
    SELL: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",  icon: <TrendingDown className="w-5 h-5" /> },
    HOLD: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)", icon: <Minus className="w-5 h-5" /> },
  }[rec ?? "HOLD"] ?? { color: "#94a3b8", bg: "transparent", border: "transparent", icon: null };

  return (
    <div className="h-screen bg-[#0f1117] text-white flex flex-col overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0f1117]/95 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white">EquiSight</span>
          <span className="text-white/20 text-xs">|</span>
          <span className="text-white/40 text-xs">AI Equity Research</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          5 Agents · Gemini 2.5 · LangGraph
        </div>
      </div>

      {/* Ticker tape */}
      <div className="flex-shrink-0"><TickerTape /></div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-white/5 bg-[#0c0e14] flex flex-col overflow-y-auto">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Watchlist</p>
            {QUICK_TICKERS.map(t => (
              <button key={t} onClick={() => setTicker(t)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between mb-0.5 transition-colors",
                  ticker === t ? "bg-blue-600/20 text-blue-400" : "text-white/50 hover:text-white hover:bg-white/5"
                )}>
                <span className="font-medium">{t}</span>
                <ChevronRight className="w-3 h-3 opacity-40" />
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 px-3 py-3 flex-1">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Pipeline <span className="text-white/15 normal-case">(click to expand)</span></p>
            {AGENT_STEPS.map((step, i) => {
              const done = appState.phase === "review" || appState.phase === "done" ||
                (appState.phase === "loading" && i < currentStep);
              const active = appState.phase === "loading" && i === currentStep;
              return <AgentCard key={i} step={step} index={i} done={done} active={active} />;
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Search bar */}
          <div className="flex-shrink-0 border-b border-white/5 bg-[#0c0e14] px-4 py-3">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="Enter stock ticker (e.g. AAPL, MSFT, TSLA, SPCX)"
                  maxLength={10}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 text-sm transition-all"
                />
              </div>
              <button type="submit" disabled={!ticker.trim() || appState.phase === "loading"}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2">
                {appState.phase === "loading"
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing…</>
                  : <><Search className="w-3.5 h-3.5" /> Analyze</>}
              </button>
              {(appState.phase !== "idle" && appState.phase !== "loading") && (
                <button type="button" onClick={reset}
                  className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 rounded-lg text-sm transition-colors">
                  Clear
                </button>
              )}
            </form>

            {appState.phase === "idle" && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-white/25">Quick pick:</span>
                {QUICK_TICKERS.slice(0, 6).map(t => (
                  <button key={t} onClick={() => setTicker(t)}
                    className="px-2 py-0.5 text-xs bg-white/5 hover:bg-white/10 border border-white/8 text-white/40 hover:text-white/70 rounded transition-colors font-mono">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* IDLE */}
            {(appState.phase === "idle" || appState.phase === "error") && (
              <div className="flex flex-col h-full">
                {/* Hero */}
                <div className="flex flex-col items-center justify-center pt-10 pb-6 px-8 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/4 text-[11px] text-white/40 mb-5 tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Powered by Gemini 2.5 · LangGraph · 5 Agents
                  </div>
                  <h1 className="text-[2.6rem] font-bold text-white mb-4 leading-[1.15] tracking-tight">
                    Institutional-grade equity research,<br />
                    delivered in seconds.
                  </h1>
                  <p className="text-white/40 text-[15px] max-w-lg mx-auto leading-relaxed">
                    A multi-agent AI system that reads SEC filings, analyzes financials, gauges sentiment, and stress-tests risk — then surfaces a committee-grade <span className="text-white/60 font-medium">BUY / HOLD / SELL</span> decision with full reasoning.
                  </p>
                </div>

                {/* Animated stock cards */}
                <div className="px-8 pb-6">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3 text-center">Live Market Pulse</p>
                  <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
                    {["AAPL", "NVDA", "TSLA", "MSFT"].map((t) => (
                      <StockCard key={t} ticker={t} />
                    ))}
                  </div>
                </div>

                {/* Agent cards — expandable */}
                <div className="px-8 pb-8">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3 text-center">Multi-Agent Pipeline <span className="text-white/15 normal-case">(click any card to learn more)</span></p>
                  <div className="grid grid-cols-5 gap-3 max-w-3xl mx-auto">
                    {AGENT_STEPS.map((step, i) => (
                      <div key={i}
                        onClick={() => setExpandedAgent(expandedAgent === i ? null : i)}
                        className={cn(
                          "bg-white/3 border rounded-xl p-4 text-center cursor-pointer transition-all hover:scale-[1.02]",
                          expandedAgent === i
                            ? "border-blue-500/40 bg-blue-500/8 scale-[1.02]"
                            : "border-white/8 hover:border-white/20"
                        )}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                          style={{ backgroundColor: `${step.color}18` }}>
                          <step.icon className="w-4 h-4" style={{ color: step.color }} />
                        </div>
                        <p className="text-xs text-white/70 font-medium leading-tight">{step.label}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">Agent {i + 1}</p>
                        <div className="mt-1.5 flex justify-center">
                          <ChevronDown className={cn(
                            "w-3 h-3 text-white/20 transition-transform",
                            expandedAgent === i && "rotate-180 text-blue-400"
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded detail panel */}
                  {expandedAgent !== null && (
                    <div className="max-w-3xl mx-auto mt-3 rounded-xl border border-white/10 bg-white/3 p-5 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${AGENT_STEPS[expandedAgent].color}18` }}>
                          {(() => { const Icon = AGENT_STEPS[expandedAgent].icon; return <Icon className="w-5 h-5" style={{ color: AGENT_STEPS[expandedAgent].color }} />; })()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-white">{AGENT_STEPS[expandedAgent].label}</p>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">Agent {expandedAgent + 1} of 5</span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed mb-3">{AGENT_STEPS[expandedAgent].description}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Tools Used</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AGENT_STEPS[expandedAgent].tools.map(t => (
                                  <span key={t} className="px-2 py-0.5 rounded-full text-[11px] border text-white/50"
                                    style={{ borderColor: `${AGENT_STEPS[expandedAgent].color}30`, backgroundColor: `${AGENT_STEPS[expandedAgent].color}0d` }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Output</p>
                              <p className="text-[12px] text-white/50">{AGENT_STEPS[expandedAgent].output}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {appState.phase === "error" && (
                  <div className="mx-8 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 text-red-400 text-sm flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {appState.message}
                  </div>
                )}
              </div>
            )}

            {/* LOADING */}
            {appState.phase === "loading" && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">Analyzing {appState.ticker}</h2>
                  <p className="text-white/40 text-sm">
                    {currentStep >= AGENT_STEPS.length - 1
                      ? "Synthesizing final decision… this may take up to 90s"
                      : "Multi-agent pipeline running…"}
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-2">
                  {AGENT_STEPS.map((step, i) => {
                    const done = i < currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={i} className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                        done ? "bg-emerald-500/8 border-emerald-500/20"
                          : active ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-white/3 border-white/5 opacity-40"
                      )}>
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center",
                          done ? "bg-emerald-500/20" : active ? "bg-blue-500/20" : "bg-white/5"
                        )}>
                          {done
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            : <step.icon className={cn("w-3.5 h-3.5", active ? "text-blue-400" : "text-white/20")} />}
                        </div>
                        <span className={cn("text-sm flex-1",
                          done ? "text-emerald-300" : active ? "text-blue-300" : "text-white/25"
                        )}>{step.label}</span>
                        {active && (
                          <div className="flex gap-0.5">
                            {[0,1,2].map(d => (
                              <span key={d} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
                                style={{ animationDelay: `${d*150}ms` }} />
                            ))}
                          </div>
                        )}
                        {done && <span className="text-[11px] text-emerald-500">Done</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REVIEW */}
            {appState.phase === "review" && (
              <div className="flex h-full">
                <div className="flex-1 overflow-y-auto">
                  <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-white">{appState.data.ticker}</h2>
                        <span className="text-white/50 text-base">{appState.status.company_name}</span>
                        {appState.status.risk_data.high_risk_review_triggered && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
                            <AlertTriangle className="w-3 h-3" /> High Risk Review
                          </span>
                        )}
                      </div>
                      <p className="text-white/30 text-xs">Analysis complete · Awaiting human approval</p>
                    </div>
                    <div className="flex-shrink-0 px-5 py-3 rounded-xl border text-center" style={{ background: recMeta.bg, borderColor: recMeta.border }}>
                      <div className="flex items-center gap-1.5 justify-center mb-1" style={{ color: recMeta.color }}>
                        {recMeta.icon}
                        <span className="text-2xl font-bold">{rec}</span>
                      </div>
                      <p className="text-xs text-white/40">{appState.data.recommendation.confidence}% confidence</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 px-5 py-4 border-b border-white/5">
                    {[
                      { label: "Financial Score", value: appState.data.financial_score, max: 100, color: appState.data.financial_score >= 70 ? "#22c55e" : appState.data.financial_score >= 40 ? "#f59e0b" : "#ef4444" },
                      { label: "Risk Score", value: appState.data.risk_score, max: 100, color: appState.data.risk_score <= 33 ? "#22c55e" : appState.data.risk_score <= 66 ? "#f59e0b" : "#ef4444" },
                      { label: "Sentiment Score", value: appState.status.news_data.sentiment_score ?? 50, max: 100, color: appState.data.sentiment === "positive" ? "#22c55e" : appState.data.sentiment === "negative" ? "#ef4444" : "#f59e0b" },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <p className="text-xs text-white/40 mb-1">{s.label}</p>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}<span className="text-sm text-white/20 font-normal">/{s.max}</span></p>
                        <ScoreBar value={s.value} color={s.color} />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-white/5 border-b border-white/5">
                    <div className="p-5">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Committee Reasoning</p>
                      <p className="text-sm text-white/70 leading-relaxed mb-4">{appState.data.recommendation.reasoning}</p>
                      {(appState.data.recommendation.key_drivers ?? []).length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Key Drivers</p>
                          {appState.data.recommendation.key_drivers!.map((d, i) => (
                            <div key={i} className="flex gap-2 text-sm text-white/60 mb-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{d}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Risk Factors</p>
                      {(appState.status.risk_data.risks ?? []).slice(0, 4).map((r, i) => (
                        <div key={i} className="flex gap-2 text-sm text-white/60 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />{r}
                        </div>
                      ))}
                      {(appState.status.news_data.key_news ?? []).length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mt-4 mb-2">News Headlines</p>
                          {appState.status.news_data.key_news!.slice(0, 3).map((n, i) => (
                            <div key={i} className="flex gap-2 text-sm text-white/50 mb-1.5">
                              <Newspaper className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />{n}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-white/5">
                    <div className="p-5">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Financial Strengths</p>
                      {(appState.status.financial_data.strengths ?? []).map((s, i) => (
                        <div key={i} className="flex gap-2 text-sm text-white/60 mb-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{s}
                        </div>
                      ))}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Areas of Concern</p>
                      {(appState.status.financial_data.weaknesses ?? []).map((w, i) => (
                        <div key={i} className="flex gap-2 text-sm text-white/60 mb-1.5">
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />{w}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sticky bottom-0 border-t border-white/5 bg-[#0f1117]/95 backdrop-blur px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">Human-in-the-Loop Approval</p>
                      <p className="text-xs text-white/30 max-w-xl">{appState.data.recommendation.disclaimer}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(false)}
                        className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-400 text-sm transition-all flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => handleApprove(true)}
                        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Approve & Generate PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="w-[420px] flex-shrink-0 border-l border-white/5 flex flex-col">
                  <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 text-xs text-white/40">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Live Chart · {appState.data.ticker}
                  </div>
                  <div className="flex-1">
                    <TradingViewChart ticker={appState.data.ticker} />
                  </div>
                </div>
              </div>
            )}

            {/* GENERATING */}
            {appState.phase === "generating" && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center animate-pulse">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-white font-semibold">Generating PDF Report…</p>
                <p className="text-white/40 text-sm">Compiling research into a professional equity report</p>
              </div>
            )}

            {/* DONE */}
            {appState.phase === "done" && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white mb-1">Report Ready</p>
                  <p className="text-white/40 text-sm">Your equity research PDF has been generated.</p>
                </div>
                <div className="flex gap-3">
                  <a href={getReportUrl(appState.runId)} target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                  <button onClick={reset}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-all">
                    New Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
