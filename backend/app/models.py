from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, TypeDecorator, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

QUESTION_TYPES = (
    "short_text", "long_text", "multiple_choice", "dropdown",
    "email", "number", "yes_no", "rating", "file_upload",
)
CHOICE_TYPES = ("multiple_choice", "dropdown")


def now() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """SQLite stores datetimes without a timezone; mark them UTC again on the way out."""

    impl = DateTime
    cache_ok = True

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    is_gallery: Mapped[bool] = mapped_column(Boolean, default=False)
    font: Mapped[str] = mapped_column(String(80), default="Inter")
    question_color: Mapped[str] = mapped_column(String(9))
    answer_color: Mapped[str] = mapped_column(String(9))
    button_color: Mapped[str] = mapped_column(String(9))
    button_text_color: Mapped[str] = mapped_column(String(9))
    background_color: Mapped[str] = mapped_column(String(9))
    background_image_url: Mapped[str | None] = mapped_column(String(500))
    corner_radius: Mapped[str] = mapped_column(String(10), default="rounded")  # square | rounded | pill


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str | None] = mapped_column(String(16), unique=True)
    status: Mapped[str] = mapped_column(String(10), default="draft")  # draft | published
    theme_id: Mapped[int] = mapped_column(ForeignKey("themes.id", ondelete="RESTRICT"))
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now, onupdate=now)

    theme: Mapped[Theme] = relationship()
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Question.position",
    )
    responses: Mapped[list["Response"]] = relationship(back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (Index("ix_questions_form_position", "form_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    # Soft delete keeps old answers readable after a creator removes a question.
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    form: Mapped[Form] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.position",
    )
    logic_rules: Mapped[list["LogicRule"]] = relationship(
        back_populates="question", cascade="all, delete-orphan",
        order_by="LogicRule.position", foreign_keys="LogicRule.question_id",
    )


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    question: Mapped[Question] = relationship(back_populates="options")


class LogicRule(Base):
    """After answering `question`, jump to `jump_to_question` when the condition matches.
    A null target means "end the form". The first matching rule wins; no match = next question."""

    __tablename__ = "logic_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    operator: Mapped[str] = mapped_column(String(10))  # is | is_not | lt | gt | always
    value: Mapped[str | None] = mapped_column(String(500))
    option_id: Mapped[int | None] = mapped_column(ForeignKey("question_options.id", ondelete="CASCADE"))
    jump_to_question_id: Mapped[int | None] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped[Question] = relationship(back_populates="logic_rules", foreign_keys=[question_id])


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (Index("ix_responses_form_status", "form_id", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String(32), unique=True)  # lets an anonymous respondent resume
    status: Mapped[str] = mapped_column(String(12), default="in_progress")  # in_progress | completed
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("response_id", "question_id", "option_id"),
        Index("ix_answers_question", "question_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    option_id: Mapped[int | None] = mapped_column(ForeignKey("question_options.id", ondelete="CASCADE"))
    value: Mapped[str | None] = mapped_column(Text)

    response: Mapped[Response] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()
    option: Mapped[QuestionOption | None] = relationship()
