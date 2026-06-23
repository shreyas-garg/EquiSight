import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.graph.state import ResearchState


SYSTEM_PROMPT = """You are a risk management specialist for an equity research firm.
Your task is to assess the investment risk profile of a company based on financial data,
news sentiment, and market context.

Risk scoring guidance:
- risk_score (0-100): 0-33 = low risk, 34-66 = medium risk, 67-100 = high risk
- risk_level: "low" (score 0-33), "medium" (score 34-66), "high" (score 67-100)
- Consider: financial leverage (D/E ratio), earnings volatility (beta), competitive risks,
  regulatory risks, macro risks, liquidity risks, management risks, sector-specific risks

Always respond with valid JSON matching this exact schema:
{
  "risk_level": "low" | "medium" | "high",
  "risk_score": number (0-100),
  "risks": ["string", ...],
  "risk_summary": "string (2-3 sentences summarizing the overall risk profile)"
}

Provide 4-6 specific, material risk factors.
"""


def run_risk_analysis(state: ResearchState) -> dict:
    """Synthesize financial and news data to assess risk using the LLM."""
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)

    context = {
        "ticker": ticker,
        "company_name": company_name,
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

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.1,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Perform a comprehensive risk assessment for {company_name} ({ticker}) "
                f"using this synthesized data:\n\n{json.dumps(context, indent=2)}"
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
        risk_data = json.loads(content)
        # Ensure risk_level matches risk_score
        score = risk_data.get("risk_score", 50)
        if score <= 33:
            risk_data["risk_level"] = "low"
        elif score <= 66:
            risk_data["risk_level"] = "medium"
        else:
            risk_data["risk_level"] = "high"
    except json.JSONDecodeError:
        risk_data = {
            "risk_level": "medium",
            "risk_score": 50,
            "risks": ["Unable to parse detailed risk analysis"],
            "risk_summary": "Risk analysis could not be fully parsed.",
        }

    return {"risk_data": risk_data}
