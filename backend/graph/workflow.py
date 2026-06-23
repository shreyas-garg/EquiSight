"""LangGraph workflow for the AI Equity Research Team."""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from backend.graph.state import ResearchState
from backend.graph.nodes import (
    company_research_node,
    financial_analysis_node,
    news_sentiment_node,
    risk_analysis_node,
    high_risk_review_node,
    investment_committee_node,
    human_approval_node,
    generate_report_node,
)


def route_after_risk(state: ResearchState) -> str:
    """Route to high_risk_review if risk_score > 75, otherwise go to investment_committee."""
    risk_score = state.risk_data.get("risk_score", 0)
    if risk_score > 75:
        return "high_risk_review"
    return "investment_committee"


def route_after_approval(state: ResearchState) -> str:
    """Route to generate_report if approved, otherwise end."""
    if state.approval_status:
        return "generate_report"
    return END


def build_workflow() -> StateGraph:
    """Build and return the compiled LangGraph workflow with memory checkpointing."""
    builder = StateGraph(ResearchState)

    # Add all nodes
    builder.add_node("company_research", company_research_node)
    builder.add_node("financial_analysis", financial_analysis_node)
    builder.add_node("news_sentiment", news_sentiment_node)
    builder.add_node("risk_analysis", risk_analysis_node)
    builder.add_node("high_risk_review", high_risk_review_node)
    builder.add_node("investment_committee", investment_committee_node)
    builder.add_node("human_approval", human_approval_node)
    builder.add_node("generate_report", generate_report_node)

    # Entry point
    builder.set_entry_point("company_research")

    # Sequential pipeline: company → financial (parallel candidate) → news → risk
    builder.add_edge("company_research", "financial_analysis")
    builder.add_edge("financial_analysis", "news_sentiment")
    builder.add_edge("news_sentiment", "risk_analysis")

    # Conditional routing after risk analysis
    builder.add_conditional_edges(
        "risk_analysis",
        route_after_risk,
        {
            "high_risk_review": "high_risk_review",
            "investment_committee": "investment_committee",
        },
    )

    # High risk review feeds into investment committee
    builder.add_edge("high_risk_review", "investment_committee")

    # Investment committee → human approval (HITL interrupt point)
    builder.add_edge("investment_committee", "human_approval")

    # Conditional routing after human approval
    builder.add_conditional_edges(
        "human_approval",
        route_after_approval,
        {
            "generate_report": "generate_report",
            END: END,
        },
    )

    builder.add_edge("generate_report", END)

    # Compile with memory checkpointing for HITL support
    memory = MemorySaver()
    graph = builder.compile(
        checkpointer=memory,
        interrupt_before=["human_approval"],
    )

    return graph


# Singleton graph instance
research_graph = build_workflow()
