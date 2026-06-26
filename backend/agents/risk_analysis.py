import json
from langsmith import traceable
from langchain_core.messages import HumanMessage, SystemMessage
from backend.graph.state import ResearchState
from backend.agents._llm import invoke_llm


SYSTEM_PROMPT = """You are a risk management specialist. Assess investment risk based on financial data and news.
risk_score 0-100: 0-33 low, 34-66 medium, 67-100 high.
Always respond with valid JSON:
{
  "risk_level": "low" | "medium" | "high",
  "risk_score": number,
  "risks": ["string", ...],
  "risk_summary": "string"
}
Provide 4-6 specific risk factors."""


@traceable(name="4. Risk Analysis Agent", run_type="chain")
def run_risk_analysis(state: ResearchState) -> dict:
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)

    context = {
        "ticker": ticker, "company_name": company_name,
        "sector": state.company_data.get("sector", "Unknown"),
        "financial_score": state.financial_data.get("financial_score", 50),
        "financial_weaknesses": state.financial_data.get("weaknesses", []),
        "beta": state.financial_data.get("raw_metrics", {}).get("beta"),
        "debt_to_equity": state.financial_data.get("raw_metrics", {}).get("debt_to_equity"),
        "revenue_growth": state.financial_data.get("raw_metrics", {}).get("revenue_growth"),
        "profit_margin": state.financial_data.get("raw_metrics", {}).get("profit_margin"),
        "news_sentiment": state.news_data.get("sentiment", "neutral"),
        "sentiment_score": state.news_data.get("sentiment_score", 50),
        "key_news": state.news_data.get("key_news", []),
        "price_change_1y": state.financial_data.get("raw_metrics", {}).get("price_change_1y_pct"),
    }

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Risk assessment for {company_name} ({ticker}):\n\n{json.dumps(context, indent=2)}"),
    ]

    content = invoke_llm(messages)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        risk_data = json.loads(content)
        score = risk_data.get("risk_score", 50)
        risk_data["risk_level"] = "low" if score <= 33 else "high" if score > 66 else "medium"
    except json.JSONDecodeError:
        risk_data = {"risk_level": "medium", "risk_score": 50, "risks": [], "risk_summary": ""}

    return {"risk_data": risk_data}
