import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.tools.finance_tool import get_company_info
from backend.graph.state import ResearchState


SYSTEM_PROMPT = """You are a professional equity research analyst specializing in company analysis.
Your task is to analyze company information and produce a structured company overview.

Given raw company data, extract and summarize the key information.
Always respond with valid JSON matching this exact schema:
{
  "company_name": "string",
  "sector": "string",
  "industry": "string",
  "market_cap": number,
  "business_summary": "string (2-3 sentences max)",
  "website": "string",
  "employees": number,
  "country": "string",
  "currency": "string"
}
"""


def run_company_research(state: ResearchState) -> dict:
    """Fetch company data and enrich it using the LLM."""
    ticker = state.ticker

    raw_data = get_company_info(ticker)

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.1,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"Analyze this company data for ticker {ticker} and return structured JSON:\n\n{json.dumps(raw_data, indent=2)}"
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
        company_data = json.loads(content)
        # Ensure numeric fields are correct types
        company_data.setdefault("market_cap", raw_data.get("market_cap", 0))
        company_data.setdefault("employees", raw_data.get("employees", 0))
    except json.JSONDecodeError:
        # Fallback to raw data if LLM output is malformed
        company_data = raw_data

    return {"company_data": company_data}
