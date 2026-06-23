import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.tools.finance_tool import get_financial_metrics
from backend.graph.state import ResearchState


SYSTEM_PROMPT = """You are a senior financial analyst with expertise in quantitative equity analysis.
Analyze the provided financial metrics and produce a structured financial assessment.

Scoring guidance:
- financial_score (0-100): 0-39 = weak, 40-69 = moderate, 70-100 = strong
- Consider: profitability (margins, ROE, ROA), growth (revenue/earnings), valuation (P/E, P/B),
  leverage (D/E), cash flow generation, and price momentum

Always respond with valid JSON matching this exact schema:
{
  "financial_score": number (0-100),
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "key_metrics_summary": "string (2-3 sentences)"
}

Provide 3-5 specific, data-driven strengths and weaknesses.
"""


def run_financial_analysis(state: ResearchState) -> dict:
    """Analyze financial metrics using the LLM."""
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)

    raw_metrics = get_financial_metrics(ticker)

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.1,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Analyze the financial metrics for {company_name} ({ticker}):\n\n"
                f"{json.dumps(raw_metrics, indent=2)}\n\n"
                "Provide a comprehensive financial score and analysis."
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
        financial_data = json.loads(content)
        financial_data["raw_metrics"] = raw_metrics
    except json.JSONDecodeError:
        financial_data = {
            "financial_score": 50,
            "strengths": ["Unable to parse detailed analysis"],
            "weaknesses": ["Unable to parse detailed analysis"],
            "key_metrics_summary": "Analysis could not be fully parsed.",
            "raw_metrics": raw_metrics,
        }

    return {"financial_data": financial_data}
