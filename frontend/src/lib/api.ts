const API_BASE = "http://localhost:8000/api";

export interface ResearchResponse {
  run_id: string;
  status: string;
  ticker: string;
  recommendation: {
    recommendation?: string;
    confidence?: number;
    reasoning?: string;
    key_drivers?: string[];
    risks_to_thesis?: string[];
    disclaimer?: string;
  };
  company_name: string;
  risk_level: string;
  risk_score: number;
  financial_score: number;
  sentiment: string;
  requires_approval: boolean;
}

export interface StatusResponse {
  run_id: string;
  status: string;
  ticker: string;
  company_name: string;
  recommendation: Record<string, unknown>;
  risk_data: {
    risk_level?: string;
    risk_score?: number;
    risks?: string[];
    risk_summary?: string;
    high_risk_review_triggered?: boolean;
  };
  financial_data: {
    financial_score?: number;
    strengths?: string[];
    weaknesses?: string[];
  };
  news_data: {
    sentiment?: string;
    sentiment_score?: number;
    key_news?: string[];
  };
  pdf_path: string;
}

export interface ApproveResponse {
  run_id: string;
  status: string;
  pdf_path: string;
}

export async function startResearch(ticker: string): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function approveResearch(
  runId: string,
  approved: boolean
): Promise<ApproveResponse> {
  const res = await fetch(`${API_BASE}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, approved }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getStatus(runId: string): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/status/${runId}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export function getReportUrl(runId: string): string {
  return `${API_BASE}/report/${runId}`;
}
