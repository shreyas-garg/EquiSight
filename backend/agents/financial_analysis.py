import json
from langsmith import traceable
from langchain_core.messages import HumanMessage, SystemMessage
from backend.tools.finance_tool import get_financial_metrics
from backend.graph.state import ResearchState
from backend.agents._llm import invoke_llm


SYSTEM_PROMPT = """You are a senior financial analyst. Analyze financial metrics and produce a structured assessment.
Scoring: financial_score 0-100 (0-39 weak, 40-69 moderate, 70-100 strong).
Always respond with valid JSON:
{
  "financial_score": number,
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "key_metrics_summary": "string"
}
Provide 3-5 specific, data-driven strengths and weaknesses."""


@traceable(name="2. Financial Analysis Agent", run_type="chain")
def run_financial_analysis(state: ResearchState) -> dict:
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)
    raw_metrics = get_financial_metrics(ticker)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Analyze financial metrics for {company_name} ({ticker}):\n\n{json.dumps(raw_metrics, indent=2)}"),
    ]

    content = invoke_llm(messages)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        financial_data = json.loads(content)
        financial_data["raw_metrics"] = raw_metrics
    except json.JSONDecodeError:
        financial_data = {"financial_score": 50, "strengths": [], "weaknesses": [], "key_metrics_summary": "", "raw_metrics": raw_metrics}

    return {"financial_data": financial_data}
