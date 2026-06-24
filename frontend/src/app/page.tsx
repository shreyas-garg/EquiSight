"use client";

import { useState, useEffect } from "react";
import {
  startResearch,
  approveResearch,
  getStatus,
  getReportUrl,
  type ResearchResponse,
  type StatusResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  XCircle, FileText, Search, BarChart2, Newspaper, Shield,
  Users, Download, ChevronRight, Activity, Terminal,
} from "lucide-react";

type AppState =
  | { phase: "idle" }
  | { phase: "loading"; ticker: string }
  | { phase: "review"; data: ResearchResponse; status: StatusResponse }
  | { phase: "generating" }
  | { phase: "done"; runId: string }
  | { phase: "error"; message: string };

const AGENT_STEPS = [
  { id: "company_research", label: "COMPANY RESEARCH", icon: Search },
  { id: "financial_analysis", label: "FINANCIAL ANALYSIS", icon: BarChart2 },
  { id: "news_sentiment", label: "NEWS SENTIMENT", icon: Newspaper },
  { id: "risk_analysis", label: "RISK ASSESSMENT", icon: Shield },
  { id: "investment_committee", label: "COMMITTEE DECISION", icon: Users },
];

const TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPCX", "RKLB"];

// TradingView chart widget
function TradingViewChart({ ticker }: { ticker: string }) {
  useEffect(() => {
    const container = document.getElementById("tv-chart-container");
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
    });
    container.appendChild(script);
  }, [ticker]);

  return (
    <div className="tradingview-widget-container h-full" style={{ height: "100%" }}>
      <div id="tv-chart-container" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

// Ticker tape
function TickerTape() {
  useEffect(() => {
    const container = document.getElementById("ticker-tape");
    if (!container || container.childElementCount > 0) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "NASDAQ:AAPL", title: "Apple" },
        { proName: "NASDAQ:MSFT", title: "Microsoft" },
        { proName: "NASDAQ:NVDA", title: "NVIDIA" },
        { proName: "NASDAQ:TSLA", title: "Tesla" },
        { proName: "NASDAQ:AMZN", title: "Amazon" },
        { proName: "NASDAQ:GOOGL", title: "Google" },
        { proName: "NASDAQ:META", title: "Meta" },
        { proName: "NYSE:RKLB", title: "Rocket Lab" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });
    container.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container border-b border-[#1a2a1a]" style={{ height: "46px" }}>
      <div id="ticker-tape" />
    </div>
  );
}

export default function HomePage() {
  const [ticker, setTicker] = useState("");
  const [appState, setAppState] = useState<AppState>({ phase: "idle" });
  const [currentStep, setCurrentStep] = useState(0);
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

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
  const recColor = rec === "BUY" ? "#00ff41" : rec === "SELL" ? "#ff3b3b" : "#ffd700";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0d1a0d] border-b border-[#1a3a1a] text-[11px]">
        <div className="flex items-center gap-4">
          <span className="text-[#00ff41] font-bold tracking-widest">EQUISIGHT</span>
          <span className="text-[#444]">|</span>
          <span className="text-[#888]">AI EQUITY RESEARCH TERMINAL</span>
        </div>
        <div className="flex items-center gap-4 text-[#555]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="text-[#00ff41]">LIVE</span>
          </span>
          <span>{time} EST</span>
          <span>5 AGENTS ACTIVE</span>
          <span>GEMINI 2.5</span>
        </div>
      </div>

      {/* Ticker tape */}
      <TickerTape />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-[#1a2a1a] bg-[#080808] flex flex-col">
          <div className="px-3 py-2 border-b border-[#1a2a1a] text-[10px] text-[#555] tracking-widest">WATCHLIST</div>
          <div className="flex-1 overflow-y-auto">
            {TICKERS.map(t => (
              <button
                key={t}
                onClick={() => setTicker(t)}
                className={cn(
                  "w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#0d1a0d] border-b border-[#111] transition-colors",
                  ticker === t ? "bg-[#0d1a0d] text-[#00ff41]" : "text-[#888]"
                )}
              >
                <span className="font-bold">{t}</span>
                <ChevronRight className="w-3 h-3 opacity-30" />
              </button>
            ))}
          </div>

          {/* Agent pipeline */}
          <div className="border-t border-[#1a2a1a]">
            <div className="px-3 py-2 text-[10px] text-[#555] tracking-widest">AGENT PIPELINE</div>
            {AGENT_STEPS.map((step, i) => {
              const done = appState.phase === "review" || appState.phase === "done" || (appState.phase === "loading" && i < currentStep);
              const active = appState.phase === "loading" && i === currentStep;
              return (
                <div key={step.id} className={cn(
                  "px-3 py-1.5 flex items-center gap-2 text-[10px] border-b border-[#0f0f0f]",
                  done ? "text-[#00ff41]" : active ? "text-[#ffd700]" : "text-[#333]"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                    done ? "bg-[#00ff41]" : active ? "bg-[#ffd700] animate-pulse" : "bg-[#222]"
                  )} />
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Search bar */}
          <div className="border-b border-[#1a2a1a] bg-[#080808] px-4 py-2 flex items-center gap-3">
            <Terminal className="w-4 h-4 text-[#00ff41]" />
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
              <span className="text-[#00ff41] text-sm">{">"}</span>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                placeholder="ENTER TICKER SYMBOL (e.g. AAPL)"
                maxLength={10}
                className="flex-1 bg-transparent text-[#00ff41] placeholder:text-[#2a4a2a] outline-none text-sm tracking-widest"
              />
              <button
                type="submit"
                disabled={!ticker.trim() || appState.phase === "loading"}
                className="px-4 py-1 border border-[#00ff41] text-[#00ff41] text-xs tracking-widest hover:bg-[#00ff41] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {appState.phase === "loading" ? "ANALYZING..." : "RUN ANALYSIS"}
              </button>
            </form>
            {(appState.phase === "review" || appState.phase === "done" || appState.phase === "error") && (
              <button onClick={reset} className="text-[10px] text-[#555] hover:text-[#888] tracking-widest">CLR</button>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">

            {/* IDLE */}
            {(appState.phase === "idle" || appState.phase === "error") && (
              <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
                <div className="text-center">
                  <div className="text-[#00ff41] text-5xl font-bold tracking-widest mb-2">EQUISIGHT</div>
                  <div className="text-[#444] text-sm tracking-widest">AI-POWERED MULTI-AGENT EQUITY RESEARCH TERMINAL</div>
                  <div className="text-[#2a2a2a] text-xs mt-2 tracking-widest">LANGGRAPH · GEMINI 2.5 · HUMAN-IN-THE-LOOP</div>
                </div>

                <div className="grid grid-cols-5 gap-px bg-[#1a2a1a] border border-[#1a2a1a] w-full max-w-3xl">
                  {AGENT_STEPS.map((step, i) => (
                    <div key={step.id} className="bg-[#080808] p-4 text-center">
                      <step.icon className="w-5 h-5 text-[#00ff41] mx-auto mb-2" />
                      <div className="text-[9px] text-[#555] tracking-widest">{step.label}</div>
                      <div className="text-[#222] text-[9px] mt-1">AGENT {i + 1}</div>
                    </div>
                  ))}
                </div>

                <div className="text-[#2a2a2a] text-xs tracking-widest animate-pulse">
                  ENTER TICKER SYMBOL ABOVE TO BEGIN ANALYSIS
                </div>

                {appState.phase === "error" && (
                  <div className="border border-[#ff3b3b] bg-[#1a0000] px-4 py-3 text-[#ff3b3b] text-xs tracking-wide max-w-lg text-center">
                    ERROR: {appState.message}
                  </div>
                )}
              </div>
            )}

            {/* LOADING */}
            {appState.phase === "loading" && (
              <div className="p-6 space-y-1">
                <div className="text-[#00ff41] text-xs tracking-widest mb-4">
                  INITIALIZING ANALYSIS FOR <span className="font-bold">{appState.ticker}</span>...
                </div>
                {AGENT_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.id} className="flex items-center gap-3 py-1.5 border-b border-[#0f0f0f] text-xs">
                      <span className={cn("w-2 h-2 rounded-full",
                        done ? "bg-[#00ff41]" : active ? "bg-[#ffd700] animate-pulse" : "bg-[#1a1a1a]"
                      )} />
                      <span className={cn("tracking-widest w-48",
                        done ? "text-[#00ff41]" : active ? "text-[#ffd700]" : "text-[#333]"
                      )}>{step.label}</span>
                      <span className={cn("text-[10px]",
                        done ? "text-[#00aa2a]" : active ? "text-[#aa8800]" : "text-[#222]"
                      )}>
                        {done ? "[ COMPLETE ]" : active ? (
                          <span className="animate-pulse">
                            {i === AGENT_STEPS.length - 1 ? "[ PROCESSING... MAY TAKE UP TO 90s ]" : "[ PROCESSING... ]"}
                          </span>
                        ) : "[ QUEUED ]"}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-4 text-[#333] text-[10px] tracking-widest">
                  MULTI-AGENT PIPELINE RUNNING · DO NOT INTERRUPT
                </div>
              </div>
            )}

            {/* REVIEW */}
            {appState.phase === "review" && (
              <div className="flex h-full">
                {/* Left: data */}
                <div className="flex-1 overflow-y-auto">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-[#1a2a1a] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white">{appState.data.ticker}</span>
                        <span className="text-[#888] text-sm">{appState.status.company_name}</span>
                        {appState.status.risk_data.high_risk_review_triggered && (
                          <span className="text-[10px] px-2 py-0.5 border border-[#ff3b3b] text-[#ff3b3b] tracking-widest">⚠ HIGH RISK REVIEW</span>
                        )}
                      </div>
                      <div className="text-[#555] text-[10px] tracking-widest mt-0.5">
                        {appState.status.status?.company_name || "ANALYSIS COMPLETE"} · AWAITING HUMAN APPROVAL
                      </div>
                    </div>
                    <div className={cn("text-3xl font-bold tracking-widest")} style={{ color: recColor }}>
                      {rec}
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-4 border-b border-[#1a2a1a]">
                    {[
                      { label: "RECOMMENDATION", value: rec || "—", color: recColor },
                      { label: "CONFIDENCE", value: `${appState.data.recommendation.confidence}%`, color: "#fff" },
                      { label: "FINANCIAL SCORE", value: `${appState.data.financial_score}/100`, color: appState.data.financial_score >= 70 ? "#00ff41" : appState.data.financial_score >= 40 ? "#ffd700" : "#ff3b3b" },
                      { label: "RISK SCORE", value: `${appState.data.risk_score}/100`, color: appState.data.risk_score <= 33 ? "#00ff41" : appState.data.risk_score <= 66 ? "#ffd700" : "#ff3b3b" },
                    ].map((m, i) => (
                      <div key={i} className="px-4 py-3 border-r border-[#1a2a1a] last:border-r-0">
                        <div className="text-[9px] text-[#555] tracking-widest mb-1">{m.label}</div>
                        <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Second metrics row */}
                  <div className="grid grid-cols-3 border-b border-[#1a2a1a]">
                    {[
                      { label: "SENTIMENT", value: (appState.data.sentiment || "neutral").toUpperCase(), color: appState.data.sentiment === "positive" ? "#00ff41" : appState.data.sentiment === "negative" ? "#ff3b3b" : "#ffd700" },
                      { label: "RISK LEVEL", value: (appState.data.risk_level || "—").toUpperCase(), color: appState.data.risk_level === "low" ? "#00ff41" : appState.data.risk_level === "high" ? "#ff3b3b" : "#ffd700" },
                      { label: "SECTOR", value: appState.status.financial_data?.strengths?.[0] ? "SEE BELOW" : (appState.status.company_name ? "—" : "—"), color: "#888" },
                    ].map((m, i) => (
                      <div key={i} className="px-4 py-2 border-r border-[#1a2a1a] last:border-r-0">
                        <div className="text-[9px] text-[#555] tracking-widest mb-1">{m.label}</div>
                        <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-[#1a2a1a]">
                    {/* Reasoning */}
                    <div className="p-4 border-b border-[#1a2a1a]">
                      <div className="text-[9px] text-[#555] tracking-widest mb-2">COMMITTEE REASONING</div>
                      <p className="text-xs text-[#aaa] leading-relaxed">{appState.data.recommendation.reasoning}</p>
                      {(appState.data.recommendation.key_drivers ?? []).length > 0 && (
                        <div className="mt-3">
                          <div className="text-[9px] text-[#555] tracking-widest mb-1.5">KEY DRIVERS</div>
                          {appState.data.recommendation.key_drivers!.map((d, i) => (
                            <div key={i} className="flex gap-2 text-[11px] text-[#888] mb-1">
                              <span className="text-[#00ff41]">+</span>{d}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Risks */}
                    <div className="p-4 border-b border-[#1a2a1a]">
                      <div className="text-[9px] text-[#555] tracking-widest mb-2">RISK FACTORS</div>
                      {(appState.status.risk_data.risks ?? []).slice(0, 5).map((r, i) => (
                        <div key={i} className="flex gap-2 text-[11px] text-[#888] mb-1.5">
                          <span className="text-[#ff3b3b]">!</span>{r}
                        </div>
                      ))}
                      {(appState.data.recommendation.risks_to_thesis ?? []).length > 0 && (
                        <div className="mt-2">
                          <div className="text-[9px] text-[#555] tracking-widest mb-1.5">RISKS TO THESIS</div>
                          {appState.data.recommendation.risks_to_thesis!.map((r, i) => (
                            <div key={i} className="flex gap-2 text-[11px] text-[#888] mb-1">
                              <span className="text-[#ffd700]">▲</span>{r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Strengths */}
                    <div className="p-4">
                      <div className="text-[9px] text-[#555] tracking-widest mb-2">FINANCIAL STRENGTHS</div>
                      {(appState.status.financial_data.strengths ?? []).map((s, i) => (
                        <div key={i} className="flex gap-2 text-[11px] text-[#888] mb-1.5">
                          <span className="text-[#00ff41]">✓</span>{s}
                        </div>
                      ))}
                    </div>

                    {/* News */}
                    <div className="p-4">
                      <div className="text-[9px] text-[#555] tracking-widest mb-2">NEWS HEADLINES</div>
                      {(appState.status.news_data.key_news ?? []).slice(0, 5).map((n, i) => (
                        <div key={i} className="flex gap-2 text-[11px] text-[#888] mb-1.5">
                          <span className="text-[#555]">›</span>{n}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HITL */}
                  <div className="border-t border-[#1a3a1a] bg-[#080808] px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] text-[#555] tracking-widest mb-0.5">HUMAN-IN-THE-LOOP APPROVAL REQUIRED</div>
                      <div className="text-[10px] text-[#333]">{appState.data.recommendation.disclaimer}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(false)} className="px-4 py-2 border border-[#ff3b3b] text-[#ff3b3b] text-xs tracking-widest hover:bg-[#ff3b3b] hover:text-black transition-all flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> REJECT
                      </button>
                      <button onClick={() => handleApprove(true)} className="px-4 py-2 border border-[#00ff41] text-[#00ff41] text-xs tracking-widest hover:bg-[#00ff41] hover:text-black transition-all flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> APPROVE & GENERATE PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: chart */}
                <div className="w-[480px] flex-shrink-0 border-l border-[#1a2a1a] flex flex-col">
                  <div className="px-3 py-2 border-b border-[#1a2a1a] text-[10px] text-[#555] tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3 text-[#00ff41]" />
                    LIVE CHART · {appState.data.ticker}
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
                <FileText className="w-10 h-10 text-[#00ff41] animate-pulse" />
                <div className="text-[#00ff41] tracking-widest">GENERATING PDF REPORT...</div>
                <div className="text-[#333] text-xs tracking-widest">COMPILING RESEARCH DATA</div>
              </div>
            )}

            {/* DONE */}
            {appState.phase === "done" && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <CheckCircle className="w-12 h-12 text-[#00ff41]" />
                <div>
                  <div className="text-[#00ff41] tracking-widest text-center mb-1">REPORT GENERATED SUCCESSFULLY</div>
                  <div className="text-[#444] text-xs tracking-widest text-center">EQUITY RESEARCH PDF READY FOR DOWNLOAD</div>
                </div>
                <div className="flex gap-3">
                  <a href={getReportUrl(appState.runId)} target="_blank" rel="noopener noreferrer"
                    className="px-6 py-2.5 border border-[#00ff41] text-[#00ff41] text-xs tracking-widest hover:bg-[#00ff41] hover:text-black transition-all flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> DOWNLOAD PDF
                  </a>
                  <button onClick={reset} className="px-6 py-2.5 border border-[#444] text-[#444] text-xs tracking-widest hover:border-[#888] hover:text-[#888] transition-all">
                    NEW ANALYSIS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#0d1a0d] border-t border-[#1a3a1a] text-[10px] text-[#444]">
        <div className="flex items-center gap-4">
          <span className="text-[#00ff41]">●</span>
          <span>SYSTEM READY</span>
          <span>·</span>
          <span>LANGGRAPH v0.2</span>
          <span>·</span>
          <span>FASTAPI BACKEND</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TAVILY SEARCH</span>
          <span>·</span>
          <span>LANGSMITH TRACING</span>
          <span>·</span>
          <span>REPORTLAB PDF</span>
        </div>
      </div>
    </div>
  );
}
