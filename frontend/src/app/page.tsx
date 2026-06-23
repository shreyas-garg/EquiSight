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
import {
  cn,
  formatMarketCap,
  getRecommendationColor,
  getSentimentColor,
  getRiskColor,
} from "@/lib/utils";
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
  ChevronRight,
  Download,
} from "lucide-react";

type AppState =
  | { phase: "idle" }
  | { phase: "loading"; ticker: string }
  | { phase: "review"; data: ResearchResponse; status: StatusResponse }
  | { phase: "generating" }
  | { phase: "done"; runId: string; pdfPath: string }
  | { phase: "error"; message: string };

const AGENT_STEPS = [
  { id: "company_research", label: "Company Research", icon: Search },
  { id: "financial_analysis", label: "Financial Analysis", icon: BarChart2 },
  { id: "news_sentiment", label: "News & Sentiment", icon: Newspaper },
  { id: "risk_analysis", label: "Risk Assessment", icon: Shield },
  { id: "investment_committee", label: "Investment Committee", icon: Users },
];

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

    // Animate through steps while waiting
    const stepInterval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, AGENT_STEPS.length - 1));
    }, 4000);

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
      const result = await approveResearch(runId, true);
      setAppState({ phase: "done", runId, pdfPath: result.pdf_path });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">AI Equity Research</h1>
              <p className="text-xs text-slate-500">Multi-Agent Analysis Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity className="w-3.5 h-3.5 text-green-500" />
            <span>5 Agents Active</span>
            <span className="mx-1">·</span>
            <span>Gemini 2.5 Flash</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Search Section */}
        {(appState.phase === "idle" || appState.phase === "error") && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                AI-Powered Equity Research
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Enter a stock ticker and our 5-agent AI system will conduct comprehensive
                research across company fundamentals, financials, news sentiment, and risk.
              </p>
            </div>

            {/* Agent pipeline visualization */}
            <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
              {AGENT_STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 shadow-sm">
                    <step.icon className="w-3.5 h-3.5 text-blue-500" />
                    <span>{step.label}</span>
                  </div>
                  {i < AGENT_STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              ))}
            </div>

            <div className="max-w-md mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="Enter ticker (e.g. AAPL, MSFT)"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm font-mono"
                  maxLength={10}
                />
                <button
                  type="submit"
                  disabled={!ticker.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                  Analyze
                </button>
              </form>

              <div className="flex gap-2 mt-3 justify-center">
                {["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTicker(t)}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors font-mono"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {appState.phase === "error" && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{appState.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {appState.phase === "loading" && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Researching {appState.ticker}
              </h2>
              <p className="text-sm text-slate-500">
                5 AI agents are analyzing the company in parallel...
              </p>
            </div>

            <div className="space-y-3">
              {AGENT_STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                      done
                        ? "bg-green-50 border-green-200"
                        : active
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-slate-200 opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        done ? "bg-green-500" : active ? "bg-blue-500" : "bg-slate-200"
                      )}
                    >
                      {done ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <step.icon
                          className={cn(
                            "w-4 h-4",
                            active ? "text-white animate-pulse" : "text-slate-400"
                          )}
                        />
                      )}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          done
                            ? "text-green-800"
                            : active
                            ? "text-blue-800"
                            : "text-slate-400"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {done ? "Completed" : active ? "In progress..." : "Queued"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review State */}
        {appState.phase === "review" && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Research Complete — Human Review Required
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Review the AI analysis below and approve to generate the full PDF report
                </p>
              </div>
              <button
                onClick={resetApp}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Start over
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Recommendation"
                value={appState.data.recommendation.recommendation || "—"}
                colorClass={getRecommendationColor(
                  appState.data.recommendation.recommendation || ""
                )}
                icon={
                  appState.data.recommendation.recommendation === "BUY" ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : appState.data.recommendation.recommendation === "SELL" ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : (
                    <Minus className="w-5 h-5" />
                  )
                }
              />
              <MetricCard
                label="Confidence"
                value={`${appState.data.recommendation.confidence ?? 0}%`}
                colorClass="text-blue-700 bg-blue-50 border-blue-200"
                icon={<Activity className="w-5 h-5" />}
              />
              <MetricCard
                label="Financial Score"
                value={`${appState.data.financial_score}/100`}
                colorClass={
                  appState.data.financial_score >= 70
                    ? "text-green-700 bg-green-50 border-green-200"
                    : appState.data.financial_score >= 40
                    ? "text-yellow-700 bg-yellow-50 border-yellow-200"
                    : "text-red-700 bg-red-50 border-red-200"
                }
                icon={<BarChart2 className="w-5 h-5" />}
              />
              <MetricCard
                label="Risk Level"
                value={`${appState.data.risk_level?.toUpperCase()} (${appState.data.risk_score})`}
                colorClass={getRiskColor(appState.data.risk_level)}
                icon={<Shield className="w-5 h-5" />}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Recommendation Reasoning */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Investment Committee Decision
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {appState.data.recommendation.reasoning || "No reasoning provided."}
                </p>
                {appState.data.recommendation.key_drivers &&
                  appState.data.recommendation.key_drivers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Key Drivers
                      </p>
                      <ul className="space-y-1">
                        {appState.data.recommendation.key_drivers.map((d, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Risk & Sentiment */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-blue-500" />
                    Market Sentiment
                  </h3>
                  <p
                    className={cn(
                      "text-sm font-semibold capitalize",
                      getSentimentColor(appState.data.sentiment)
                    )}
                  >
                    {appState.data.sentiment || "neutral"}
                  </p>
                  {appState.status.news_data.key_news &&
                    appState.status.news_data.key_news.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {appState.status.news_data.key_news.slice(0, 3).map((n, i) => (
                          <li key={i} className="text-xs text-slate-600 flex gap-2">
                            <span className="text-slate-400 mt-0.5">•</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                {appState.status.risk_data.high_risk_review_triggered && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        High Risk Review Triggered
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">
                        Risk score exceeded 75/100. Additional committee oversight applied.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* HITL Approval */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Human-in-the-Loop Approval Required
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Review the AI-generated analysis above. Approve to generate the full PDF
                    report, or reject to discard this research.
                  </p>
                  <p className="text-xs text-blue-600 italic mb-4">
                    {appState.data.recommendation.disclaimer}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(true)}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Generate PDF
                    </button>
                    <button
                      onClick={() => handleApprove(false)}
                      className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generating PDF */}
        {appState.phase === "generating" && (
          <div className="animate-fade-in text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Generating PDF Report</h2>
            <p className="text-sm text-slate-500">
              Compiling research into a professional equity report...
            </p>
          </div>
        )}

        {/* Done */}
        {appState.phase === "done" && (
          <div className="animate-fade-in text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Research Report Ready
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Your equity research report has been generated successfully.
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href={getReportUrl(appState.runId)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF Report
              </a>
              <button
                onClick={resetApp}
                className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-medium transition-colors"
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

function MetricCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border p-4", colorClass)}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
