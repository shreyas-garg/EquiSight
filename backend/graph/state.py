from typing import Annotated, Any
from pydantic import BaseModel, Field
from langgraph.graph.message import add_messages


class ResearchState(BaseModel):
    ticker: str
    company_data: dict[str, Any] = Field(default_factory=dict)
    financial_data: dict[str, Any] = Field(default_factory=dict)
    news_data: dict[str, Any] = Field(default_factory=dict)
    risk_data: dict[str, Any] = Field(default_factory=dict)
    recommendation: dict[str, Any] = Field(default_factory=dict)
    approval_status: bool = False
    pdf_path: str = ""
    error: str = ""
    run_id: str = ""
