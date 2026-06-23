import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.graph.state import ResearchState


SYSTEM_PROMPT = """You are the chair of an Investment Committee at a premier equity research firm.
Your role is to synthesize all research outputs and render a final investment decision.

Decision framework:
- BUY: Strong financials + positive/neutral sentiment + manageable risk + compelling valuation
- HOLD: Mixed signals, fair valuation, or moderate risk without clear catalyst
- SELL: Weak financials, negative sentiment, high risk, or significant overvaluation
- confidence (0-100): How confident you are in the recommendation

CRITICAL GUARDRAILS — You MUST follow these:
1. NEVER guarantee specific future price targets
2. NEVER promise specific returns or percentage gains/losses
3. ALWAYS include that this is not financial advice
4. Base reasoning on the research data provided, not speculation

Always respond with valid JSON matching this exact schema:
{
  "recommendation": "BUY" | "HOLD" | "SELL",
  "confidence": number (0-100),
  "reasoning": "string (3-4 sentences synthesizing all factors)",
  "key_drivers": ["string", ...],
  "risks_to_thesis": ["string", ...]
}

Provide 2-4 key drivers and 2-3 risks to the investment thesis.
"""


GUARDRAIL_PATTERNS = [
    "guarantee", "guaranteed", "will definitely", "certain to", "100% sure",
    "promise", "risk-free", "no risk", "always goes up", "never lose",
    "price target of exactly", "will reach $", "will hit $",
]


def check_guardrails(text: str) -> bool:
    """Return True if the text violates financial advice guardrails."""
    lower = text.lower()
    return any(pattern in lower for pattern in GUARDRAIL_PATTERNS)


DISCLAIMER = (
    "DISCLAIMER: This is an AI-generated research report for informational and educational purposes only. "
    "It does not constitute financial advice, investment recommendations, or a solicitation to buy or sell "
    "any securities. Past performance is not indicative of future results. Always consult a qualified "
    "financial professional before making investment decisions."
)


def run_investment_committee(state: ResearchState) -> dict:
    """Render final investment recommendation synthesizing all agent outputs."""
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)

    synthesis = {
        "ticker": ticker,
        "company_name": company_name,
        "sector": state.company_data.get("sector", "Unknown"),
        "market_cap": state.company_data.get("market_cap", 0),
        "financial_score": state.financial_data.get("financial_score", 50),
        "financial_strengths": state.financial_data.get("strengths", []),
        "financial_weaknesses": state.financial_data.get("weaknesses", []),
        "key_metrics_summary": state.financial_data.get("key_metrics_summary", ""),
        "news_sentiment": state.news_data.get("sentiment", "neutral"),
        "sentiment_score": state.news_data.get("sentiment_score", 50),
        "key_news": state.news_data.get("key_news", [])[:4],
        "risk_level": state.risk_data.get("risk_level", "medium"),
        "risk_score": state.risk_data.get("risk_score", 50),
        "top_risks": state.risk_data.get("risks", [])[:4],
        "current_price": state.financial_data.get("raw_metrics", {}).get("current_price"),
        "pe_ratio": state.financial_data.get("raw_metrics", {}).get("pe_ratio"),
        "analyst_recommendation": state.financial_data.get("raw_metrics", {}).get("recommendation_key", ""),
        "price_change_1y": state.financial_data.get("raw_metrics", {}).get("price_change_1y_pct"),
    }

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.2,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Render an investment committee decision for {company_name} ({ticker}) "
                f"based on this comprehensive research synthesis:\n\n{json.dumps(synthesis, indent=2)}"
            )
        ),
    ]

    response = llm.invoke(messages)
    content = response.content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        recommendation = json.loads(content)
    except json.JSONDecodeError:
        recommendation = {
            "recommendation": "HOLD",
            "confidence": 50,
            "reasoning": "Unable to parse full committee analysis. Defaulting to HOLD.",
            "key_drivers": [],
            "risks_to_thesis": [],
        }

    # Guardrail check — replace reasoning if it violates constraints
    if check_guardrails(recommendation.get("reasoning", "")):
        recommendation["reasoning"] = (
            f"Based on a comprehensive analysis of {company_name}'s financials, market sentiment, "
            f"and risk profile, the committee recommends {recommendation.get('recommendation', 'HOLD')}. "
            "This assessment is based on current available data and subject to change."
        )

    # Always append disclaimer
    recommendation["disclaimer"] = DISCLAIMER

    return {"recommendation": recommendation}
