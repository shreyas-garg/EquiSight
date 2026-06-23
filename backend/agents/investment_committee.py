import json
from langchain_core.messages import HumanMessage, SystemMessage
from backend.graph.state import ResearchState
from backend.agents._llm import invoke_llm


SYSTEM_PROMPT = """You are the chair of an Investment Committee. Synthesize all research and render a final decision.
- BUY: Strong financials + positive/neutral sentiment + manageable risk
- HOLD: Mixed signals or moderate risk without clear catalyst
- SELL: Weak financials, negative sentiment, or high risk
NEVER guarantee returns or price targets. Always respond with valid JSON:
{
  "recommendation": "BUY" | "HOLD" | "SELL",
  "confidence": number (0-100),
  "reasoning": "string (3-4 sentences)",
  "key_drivers": ["string", ...],
  "risks_to_thesis": ["string", ...]
}"""

DISCLAIMER = (
    "DISCLAIMER: This is an AI-generated research report for informational and educational purposes only. "
    "It does not constitute financial advice, investment recommendations, or a solicitation to buy or sell "
    "any securities. Past performance is not indicative of future results. Always consult a qualified "
    "financial professional before making investment decisions."
)

GUARDRAIL_PATTERNS = ["guarantee", "guaranteed", "will definitely", "certain to", "promise", "risk-free", "no risk"]


def run_investment_committee(state: ResearchState) -> dict:
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)

    synthesis = {
        "ticker": ticker, "company_name": company_name,
        "financial_score": state.financial_data.get("financial_score", 50),
        "financial_strengths": state.financial_data.get("strengths", []),
        "financial_weaknesses": state.financial_data.get("weaknesses", []),
        "news_sentiment": state.news_data.get("sentiment", "neutral"),
        "sentiment_score": state.news_data.get("sentiment_score", 50),
        "key_news": state.news_data.get("key_news", [])[:4],
        "risk_level": state.risk_data.get("risk_level", "medium"),
        "risk_score": state.risk_data.get("risk_score", 50),
        "top_risks": state.risk_data.get("risks", [])[:4],
        "pe_ratio": state.financial_data.get("raw_metrics", {}).get("pe_ratio"),
        "price_change_1y": state.financial_data.get("raw_metrics", {}).get("price_change_1y_pct"),
    }

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Investment committee decision for {company_name} ({ticker}):\n\n{json.dumps(synthesis, indent=2)}"),
    ]

    content = invoke_llm(messages, temperature=0.2)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        recommendation = json.loads(content)
    except json.JSONDecodeError:
        recommendation = {"recommendation": "HOLD", "confidence": 50, "reasoning": "", "key_drivers": [], "risks_to_thesis": []}

    if any(p in recommendation.get("reasoning", "").lower() for p in GUARDRAIL_PATTERNS):
        recommendation["reasoning"] = (
            f"Based on comprehensive analysis of {company_name}, the committee recommends "
            f"{recommendation.get('recommendation', 'HOLD')} based on current available data."
        )

    recommendation["disclaimer"] = DISCLAIMER
    return {"recommendation": recommendation}
