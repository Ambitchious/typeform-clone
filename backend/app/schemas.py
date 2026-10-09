from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .models import QUESTION_TYPES

QuestionType = Literal[QUESTION_TYPES]  # type: ignore[valid-type]
Operator = Literal["is", "is_not", "lt", "gt", "always"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ThemeIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    font: str = "Inter"
    question_color: str
    answer_color: str
    button_color: str
    button_text_color: str
    background_color: str
    background_image_url: str | None = None
    corner_radius: Literal["square", "rounded", "pill"] = "rounded"


class ThemeOut(ThemeIn, ORM):
    id: int
    is_gallery: bool


class OptionIn(BaseModel):
    id: int | None = None
    label: str = Field(max_length=500)


class OptionOut(ORM):
    id: int
    label: str
    position: int


class LogicRuleIn(BaseModel):
    operator: Operator
    value: str | None = None
    option_id: int | None = None
    jump_to_question_id: int | None = None


class LogicRuleOut(LogicRuleIn, ORM):
    id: int


class QuestionOut(ORM):
    id: int
    type: str
    title: str
    description: str
    required: bool
    position: int
    config: dict[str, Any]
    options: list[OptionOut]
    logic_rules: list[LogicRuleOut]
    answer_count: int = 0


class QuestionCreate(BaseModel):
    type: QuestionType
    title: str = ""
    after_question_id: int | None = None  # insert after this question; None = append


class QuestionUpdate(BaseModel):
    type: QuestionType | None = None
    title: str | None = None
    description: str | None = None
    required: bool | None = None
    config: dict[str, Any] | None = None
    options: list[OptionIn] | None = None
    logic_rules: list[LogicRuleIn] | None = None


class ReorderIn(BaseModel):
    question_ids: list[int]


class FormCreate(BaseModel):
    title: str = Field(default="My new form", max_length=200)


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    theme_id: int | None = None
    settings: dict[str, Any] | None = None


class FormSummary(ORM):
    id: int
    title: str
    status: str
    slug: str | None
    created_at: datetime
    updated_at: datetime
    theme: ThemeOut
    response_count: int = 0
    started_count: int = 0


class FormDetail(FormSummary):
    settings: dict[str, Any]
    view_count: int
    questions: list[QuestionOut]


class PublicForm(BaseModel):
    title: str
    slug: str
    theme: ThemeOut
    settings: dict[str, Any]
    questions: list[QuestionOut]


class AnswersIn(BaseModel):
    answers: dict[str, Any]  # question id (as string, JSON keys) -> answer value


class StartOut(BaseModel):
    response_id: int
    token: str


class AnswerOut(BaseModel):
    question_id: int
    question_title: str
    question_type: str
    value: Any


class ResponseOut(BaseModel):
    id: int
    status: str
    started_at: datetime
    completed_at: datetime | None
    answers: list[AnswerOut]


class ResponsePage(BaseModel):
    total: int
    items: list[ResponseOut]
