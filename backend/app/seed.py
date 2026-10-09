"""Seeds gallery themes, two published forms with responses and one draft. Runs only on an empty database."""

import random
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Form, LogicRule, Question, QuestionOption, Response, Theme, now
from .services.forms import DEFAULT_SETTINGS
from .services.sample import generate_response

THEMES = [
    ("Pearl White", "Inter", "#262627", "#262627", "#262627", "#FFFFFF", "#FFFFFF"),
    ("Classic Blue", "Inter", "#191919", "#0445AF", "#0445AF", "#FFFFFF", "#FFFFFF"),
    ("Inky Black", "Inter", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#262627", "#262627"),
    ("Plain Blue", "Source Sans 3", "#3D3D3D", "#4FB0AE", "#4FB0AE", "#FFFFFF", "#FFFFFF"),
    ("Toffee", "Karla", "#452A1C", "#452A1C", "#452A1C", "#F4D39F", "#F4D39F"),
    ("Forest", "Montserrat", "#F1F5EE", "#F1F5EE", "#F1F5EE", "#1F3A2B", "#1F3A2B"),
]


def q(type_: str, title: str, *, required=False, description="", config=None, options=()) -> Question:
    question = Question(type=type_, title=title, required=required, description=description, config=config or {}, position=0)
    question.options = [QuestionOption(label=label, position=i) for i, label in enumerate(options)]
    return question


def make_form(title: str, theme: Theme, questions: list[Question], welcome: dict, thank_you: dict, slug=None) -> Form:
    settings = {**DEFAULT_SETTINGS, "welcome": {**DEFAULT_SETTINGS["welcome"], **welcome},
                "thank_you": {**DEFAULT_SETTINGS["thank_you"], **thank_you}}
    form = Form(title=title, theme=theme, settings=settings, slug=slug, status="published" if slug else "draft")
    for i, question in enumerate(questions):
        question.position = i
        form.questions.append(question)
    return form


def seed(db: Session) -> None:
    if db.scalar(select(Theme.id).limit(1)):
        return
    themes = [Theme(name=n, font=f, question_color=qc, answer_color=ac, button_color=bc, button_text_color=bt,
                    background_color=bg, is_gallery=True) for n, f, qc, ac, bc, bt, bg in THEMES]
    db.add_all(themes)

    rating = q("rating", "How was the coffee today?", required=True, config={"steps": 5, "shape": "star"})
    what_wrong = q("long_text", "Sorry to hear that. What went wrong?",
                   description="We read every answer and get back to you within a day.")
    order = q("multiple_choice", "What did you order?", required=True, config={"multiple": True},
              options=["Cappuccino", "Cold brew", "Masala chai", "Avocado toast", "Croissant"])
    cafe = make_form("Café Feedback", themes[4], [
        q("short_text", "Hi there! What's your first name?", required=True, config={"max_length": 60}),
        rating,
        what_wrong,
        order,
        q("dropdown", "Which branch did you visit?", required=True,
          options=["Model Town", "Sarabha Nagar", "Pakhowal Road", "Ferozepur Road", "BRS Nagar"]),
        q("number", "How many times did you visit us this month?", config={"min": 0, "max": 31}),
        q("yes_no", "Would you recommend us to a friend?", required=True),
        q("email", "Want a 10% discount code? Drop your email", description="We only send the code, promise."),
        q("long_text", "Anything else we could do better?"),
    ], {"title": "Tell us about your visit ☕", "description": "Takes about a minute. Every answer helps us brew better."},
       {"title": "Thanks — see you soon!", "description": "Your discount code is BREW10."}, slug="cafe-feedback")

    attending = q("yes_no", "Will you be joining us on 24 October?", required=True)
    meetup = make_form("Tech Meetup RSVP", themes[1], [
        q("short_text", "What's your full name?", required=True),
        q("email", "Your email, so we can send the venue details", required=True),
        attending,
        q("dropdown", "Which track interests you most?", required=True,
          options=["AI & ML", "Web & Frontend", "Cloud & DevOps", "Product & Design"]),
        q("multiple_choice", "What would you like to get out of it?", config={"multiple": True, "max_selections": 2},
          options=["Learn something new", "Meet people", "Find a job", "Find a co-founder"]),
        q("number", "How many guests are you bringing?", config={"min": 0, "max": 3}),
        q("rating", "How excited are you?", config={"steps": 10, "shape": "heart"}),
        q("long_text", "Any dietary requirements or questions for us?"),
    ], {"title": "Ludhiana Tech Meetup — RSVP", "description": "An evening of talks, demos and chai."},
       {"title": "You're on the list!", "description": "We'll email the venue details a week before."}, slug="tech-meetup")

    draft = make_form("Product Research Survey", themes[0], [
        q("short_text", "What's your role?"),
        q("rating", "How satisfied are you with your current form builder?", config={"steps": 5, "shape": "star"}),
    ], {"title": "Help us build a better product"}, {})
    db.add_all([cafe, meetup, draft])
    db.flush()

    # Logic jumps: happy coffee ratings skip the complaint question; "No" to attending ends the form.
    rating.logic_rules = [LogicRule(operator="gt", value="2", jump_to_question_id=order.id)]
    attending.logic_rules = [LogicRule(operator="is", value="no", jump_to_question_id=None)]
    db.commit()

    rng = random.Random(42)
    for form, count in ((cafe, 23), (meetup, 14)):
        for i in range(count):
            generate_response(db, form, rng, when=now() - timedelta(days=rng.uniform(0, 14)))
        for _ in range(4):  # abandoned starts, so completion rate is realistic
            db.add(Response(form=form, token=f"{rng.getrandbits(128):032x}", started_at=now() - timedelta(days=rng.uniform(0, 14))))
        form.view_count = count + 4 + rng.randint(6, 15)
    db.commit()
