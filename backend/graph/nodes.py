"""LangGraph node wrappers for each agent."""
from backend.graph.state import ResearchState
from backend.agents.company_research import run_company_research
from backend.agents.financial_analysis import run_financial_analysis
from backend.agents.news_sentiment import run_news_sentiment
from backend.agents.risk_analysis import run_risk_analysis
from backend.agents.investment_committee import run_investment_committee


def company_research_node(state: ResearchState) -> dict:
    return run_company_research(state)


def financial_analysis_node(state: ResearchState) -> dict:
    return run_financial_analysis(state)


def news_sentiment_node(state: ResearchState) -> dict:
    return run_news_sentiment(state)


def risk_analysis_node(state: ResearchState) -> dict:
    return run_risk_analysis(state)


def investment_committee_node(state: ResearchState) -> dict:
    return run_investment_committee(state)


def high_risk_review_node(state: ResearchState) -> dict:
    """Additional review node triggered when risk_score > 75."""
    risk_score = state.risk_data.get("risk_score", 0)
    risk_level = state.risk_data.get("risk_level", "high")

    additional_risks = [
        f"HIGH RISK ALERT: Risk score of {risk_score}/100 exceeds the 75-point threshold",
        "Enhanced due diligence required before any investment decision",
        "Position sizing should be limited given elevated risk profile",
    ]

    existing_risks = state.risk_data.get("risks", [])
    updated_risk_data = {
        **state.risk_data,
        "risks": additional_risks + existing_risks,
        "high_risk_review_triggered": True,
        "risk_summary": (
            f"HIGH RISK FLAG: {state.risk_data.get('risk_summary', '')} "
            f"This position requires additional committee oversight due to risk score of {risk_score}/100."
        ),
    }

    return {"risk_data": updated_risk_data}


def human_approval_node(state: ResearchState) -> dict:
    """Placeholder node — actual approval is managed via the API interrupt mechanism."""
    # This node is where LangGraph pauses for human-in-the-loop approval.
    # The graph is interrupted here and resumes when /api/approve is called.
    return {}


def generate_report_node(state: ResearchState) -> dict:
    """Generate the PDF report after human approval."""
    from backend.tools.pdf_tool import generate_report

    try:
        pdf_path = generate_report(
            run_id=state.run_id,
            ticker=state.ticker,
            company_data=state.company_data,
            financial_data=state.financial_data,
            news_data=state.news_data,
            risk_data=state.risk_data,
            recommendation=state.recommendation,
        )
        return {"pdf_path": pdf_path}
    except Exception as e:
        return {"error": f"PDF generation failed: {str(e)}", "pdf_path": ""}
