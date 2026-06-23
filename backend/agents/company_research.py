import json
from langchain_core.messages import HumanMessage, SystemMessage
from backend.tools.finance_tool import get_company_info
from backend.graph.state import ResearchState
from backend.agents._llm import invoke_llm


SYSTEM_PROMPT = """You are a professional equity research analyst specializing in company analysis.
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
}"""


def run_company_research(state: ResearchState) -> dict:
    ticker = state.ticker
    raw_data = get_company_info(ticker)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Analyze this company data for ticker {ticker} and return structured JSON:\n\n{json.dumps(raw_data, indent=2)}"),
    ]

    content = invoke_llm(messages)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        company_data = json.loads(content)
        company_data.setdefault("market_cap", raw_data.get("market_cap", 0))
        company_data.setdefault("employees", raw_data.get("employees", 0))
    except json.JSONDecodeError:
        company_data = raw_data

    return {"company_data": company_data}
