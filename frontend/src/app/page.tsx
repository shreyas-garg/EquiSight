"use client";

import { useState } from "react";
import {
  startResearch,
  approveResearch,
  getStatus,
  getReportUrl,
  type ResearchResponse,
  type StatusResponse,
} from "@/lib/api";
import { cn, getSentimentColor } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Activity,
  BarChart2,
  Newspaper,
  Shield,
  Users,
  Download,
  ArrowRight,
  Sparkles,
  ChevronRight,
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
  { id: "company_research", label: "Company Research", desc: "Profile & fundamentals", icon: Search },
  { id: "financial_analysis", label: "Financial Analysis", desc: "Scoring metrics", icon: BarChart2 },
  { id: "news_sentiment", label: "News Sentiment", desc: "Market signals", icon: Newspaper },
  { id: "risk_analysis", label: "Risk Assessment", desc: "Risk profiling", icon: Shield },
  { id: "investment_committee", label: "Committee Decision", desc: "BUY / HOLD / SELL", icon: Users },
];

const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];

export default function HomePage() {
  const [ticker, setTicker] = useState("");
  const [appState, setAppState] = useState<AppState>({ phase: "idle" });
  const [currentStep, setCurrentStep] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) return;

    setAppState({ phase: "loading", ticker: t });
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, AGENT_STEPS.length - 1));
    }, 4500);

    try {
      const research = await startResearch(t);
      clearInterval(stepInterval);
      setCurrentStep(AGENT_STEPS.length);
      const status = await getStatus(research.run_id);
      setAppState({ phase: "review", data: research, status });
    } catch (err) {
      clearInterval(stepInterval);
      setAppState({
        phase: "error",
        message: err instanceof Error ? err.message : "Research failed",
      });
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (appState.phase !== "review") return;
    const runId = appState.data.run_id;

    if (!approved) {
      setAppState({ phase: "idle" });
      setTicker("");
      return;
    }

    setAppState({ phase: "generating" });
    try {
      await approveResearch(runId, true);
      setAppState({ phase: "done", runId });
    } catch (err) {
      setAppState({
        phase: "error",
        message: err instanceof Error ? err.message : "Report generation failed",
      });
    }
  };

  const resetApp = () => {
    setAppState({ phase: "idle" });
    setTicker("");
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50 bg-[#0a0f1e]/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">EquiSight</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>5 agents · Gemini 2.5 Flash · LangGraph</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6">

        {/* ── IDLE / ERROR ─────────────────────────────────────────── */}
        {(appState.phase === "idle" || appState.phase === "error") && (
          <div className="animate-fade-in">
            {/* Hero */}
            <div className="pt-24 pb-16 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                Multi-Agent AI · Human-in-the-Loop
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-tight">
                Institutional-grade<br />equity research, instant.
              </h1>
              <p className="text-white/50 text-lg max-w-lg mx-auto mb-12 leading-relaxed">
                Five specialized AI agents analyze any stock across fundamentals, financials, sentiment, and risk — then surface a BUY / HOLD / SELL decision.
              </p>

              {/* Search box */}
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 w-4 h-4 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="Enter ticker symbol…"
                    maxLength={10}
                    className="w-full pl-11 pr-36 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all text-sm font-mono tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={!ticker.trim()}
                    className="absolute right-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                  >
                    Analyze <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Quick picks */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-xs text-white/25">Try:</span>
                {POPULAR_TICKERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTicker(t); }}
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 rounded-lg transition-all font-mono"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {appState.phase === "error" && (
                <div className="mt-6 max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{appState.message}</span>
                </div>
              )}
            </div>

            {/* Agent pipeline cards */}
            <div className="grid grid-cols-5 gap-3 pb-20">
              {AGENT_STEPS.map((step, i) => (
                <div key={step.id} className="relative group">
                  <div className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-white/15 hover:bg-white/6 transition-all text-center">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center mx-auto mb-3">
                      <step.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-xs font-semibold text-white/80 mb-1">{step.label}</p>
                    <p className="text-xs text-white/30">{step.desc}</p>
                  </div>
                  {i < AGENT_STEPS.length - 1 && (
                    <ChevronRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING ──────────────────────────────────────────────── */}
        {appState.phase === "loading" && (
          <div className="animate-fade-in min-h-[80vh] flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="text-center mb-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mx-auto mb-5">
                  <Brain className="w-7 h-7 text-white animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Analyzing {appState.ticker}</h2>
                <p className="text-sm text-white/40">Multi-agent pipeline running…</p>
              </div>

              <div className="space-y-2.5">
                {AGENT_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500",
                        done ? "bg-emerald-500/10 border-emerald-500/25"
                          : active ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-white/3 border-white/6 opacity-40"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                        done ? "bg-emerald-500/20" : active ? "bg-blue-500/20" : "bg-white/5"
                      )}>
                        {done
                          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          : <step.icon className={cn("w-3.5 h-3.5", active ? "text-blue-400" : "text-white/20")} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", done ? "text-emerald-300" : active ? "text-blue-300" : "text-white/30")}>
                          {step.label}
                        </p>
                      </div>
                      {active && (
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map((d) => (
                            <span key={d} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                          ))}
                        </div>
                      )}
                      {done && <span className="text-xs text-emerald-500">Done</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── REVIEW ───────────────────────────────────────────────── */}
        {appState.phase === "review" && (
          <div className="animate-fade-in py-10">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-medium">Analysis Complete</span>
                  {appState.status.risk_data.high_risk_review_triggered && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> High Risk Review
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {appState.status.company_name || appState.data.ticker}
                  <span className="text-white/30 ml-2 text-lg font-normal">{appState.data.ticker}</span>
                </h2>
              </div>
              <button onClick={resetApp} className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
                New search
              </button>
            </div>

            {/* Recommendation hero */}
            <div className={cn(
              "rounded-2xl border p-6 mb-6",
              appState.data.recommendation.recommendation === "BUY"
                ? "bg-emerald-500/8 border-emerald-500/20"
                : appState.data.recommendation.recommendation === "SELL"
                ? "bg-red-500/8 border-red-500/20"
                : "bg-amber-500/8 border-amber-500/20"
            )}>
              <div className="flex items-start gap-6">
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0",
                  appState.data.recommendation.recommendation === "BUY" ? "bg-emerald-500/20"
                  : appState.data.recommendation.recommendation === "SELL" ? "bg-red-500/20"
                  : "bg-amber-500/20"
                )}>
                  {appState.data.recommendation.recommendation === "BUY"
                    ? <TrendingUp className="w-8 h-8 text-emerald-400" />
                    : appState.data.recommendation.recommendation === "SELL"
                    ? <TrendingDown className="w-8 h-8 text-red-400" />
                    : <Minus className="w-8 h-8 text-amber-400" />
                  }
                  <span className={cn(
                    "text-xs font-bold mt-1",
                    appState.data.recommendation.recommendation === "BUY" ? "text-emerald-400"
                    : appState.data.recommendation.recommendation === "SELL" ? "text-red-400"
                    : "text-amber-400"
                  )}>
                    {appState.data.recommendation.recommendation}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/60 leading-relaxed mb-4">
                    {appState.data.recommendation.reasoning}
                  </p>
                  {(appState.data.recommendation.key_drivers ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {appState.data.recommendation.key_drivers!.map((d, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-3xl font-bold text-white">{appState.data.recommendation.confidence}%</p>
                  <p className="text-xs text-white/30 mt-0.5">confidence</p>
                </div>
              </div>
            </div>

            {/* Metric row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <ScoreCard
                label="Financial Score"
                score={appState.data.financial_score}
                icon={<BarChart2 className="w-4 h-4" />}
                color={appState.data.financial_score >= 70 ? "emerald" : appState.data.financial_score >= 40 ? "amber" : "red"}
              />
              <ScoreCard
                label="Risk Score"
                score={appState.data.risk_score}
                icon={<Shield className="w-4 h-4" />}
                color={appState.data.risk_score <= 33 ? "emerald" : appState.data.risk_score <= 66 ? "amber" : "red"}
                invert
              />
              <div className="rounded-xl bg-white/3 border border-white/8 p-4">
                <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
                  <Newspaper className="w-4 h-4" />
                  News Sentiment
                </div>
                <p className={cn("text-xl font-bold capitalize", getSentimentColor(appState.data.sentiment))}>
                  {appState.data.sentiment || "Neutral"}
                </p>
                {appState.status.news_data.key_news?.slice(0, 2).map((n, i) => (
                  <p key={i} className="text-xs text-white/30 mt-2 leading-snug line-clamp-2">• {n}</p>
                ))}
              </div>
            </div>

            {/* Strengths / Risks */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-white/3 border border-white/8 p-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Strengths</p>
                <ul className="space-y-2">
                  {(appState.status.financial_data.strengths ?? []).slice(0, 4).map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-white/60">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-white/3 border border-white/8 p-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Risk Factors</p>
                <ul className="space-y-2">
                  {(appState.status.risk_data.risks ?? []).slice(0, 4).map((r, i) => (
                    <li key={i} className="flex gap-2 text-xs text-white/60">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* HITL approval */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Human-in-the-Loop Approval</h3>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed max-w-lg">
                    {appState.data.recommendation.disclaimer}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleApprove(true)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Approve & Generate PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GENERATING ───────────────────────────────────────────── */}
        {appState.phase === "generating" && (
          <div className="animate-fade-in min-h-[80vh] flex flex-col items-center justify-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <FileText className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Generating PDF Report</h2>
              <p className="text-sm text-white/40">Compiling research into a professional equity report…</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── DONE ─────────────────────────────────────────────────── */}
        {appState.phase === "done" && (
          <div className="animate-fade-in min-h-[80vh] flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Report Ready</h2>
              <p className="text-sm text-white/40">Your equity research PDF has been generated.</p>
            </div>
            <div className="flex gap-3">
              <a
                href={getReportUrl(appState.runId)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </a>
              <button
                onClick={resetApp}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all"
              >
                Analyze Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  icon,
  color,
  invert = false,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  color: "emerald" | "amber" | "red";
  invert?: boolean;
}) {
  const colorMap = {
    emerald: { text: "text-emerald-400", bar: "bg-emerald-500" },
    amber: { text: "text-amber-400", bar: "bg-amber-500" },
    red: { text: "text-red-400", bar: "bg-red-500" },
  };
  const c = colorMap[color];

  return (
    <div className="rounded-xl bg-white/3 border border-white/8 p-4">
      <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
        {icon}
        {label}
      </div>
      <p className={cn("text-3xl font-bold mb-3", c.text)}>{score}<span className="text-sm text-white/30 font-normal">/100</span></p>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
