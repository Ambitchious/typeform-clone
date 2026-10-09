import random
from datetime import timedelta
from typing import Any

from sqlalchemy.orm import Session

from ..logic import next_index
from ..models import Form, Question, Response, now
from .forms import live_questions
from .responses import submit

NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Ishaan", "Sara"]
# Text answers are picked by a keyword in the question title, so test data reads like real answers.
TEXT = {
    "wrong": ["Waited 15 minutes for my order", "Coffee was lukewarm", "Too noisy to talk", "Table wasn't cleaned"],
    "better": ["More vegan options please", "Faster wifi", "Open a little earlier", "More plug points"],
    "dietary": ["Vegetarian", "No nuts, please", "Is there parking nearby?", "Vegan"],
    "role": ["Frontend developer", "Student", "Product manager", "Data scientist"],
    "": ["Loved it", "Great experience overall", "Nothing to add", "Keep it up"],
}


def sample_text(q: Question, rng: random.Random) -> str:
    title = q.title.lower()
    if "name" in title:
        return rng.choice(NAMES)
    return rng.choice(next(pool for key, pool in TEXT.items() if key in title))


def random_answer(q: Question, rng: random.Random) -> Any:
    options = [o.id for o in q.options if o.deleted_at is None]
    if not q.required and rng.random() < 0.25:
        return None
    match q.type:
        case "short_text" | "long_text":
            return sample_text(q, rng)
        case "email":
            return f"{rng.choice(NAMES).lower()}{rng.randint(1, 99)}@example.com"
        case "number":
            return rng.randint(int(q.config.get("min") or 0), int(q.config.get("max") or 20))
        case "yes_no":
            return rng.choice(["yes", "yes", "no"])
        case "rating":
            return rng.choices(range(1, q.config.get("steps", 5) + 1), weights=range(1, q.config.get("steps", 5) + 1))[0]
        case "dropdown":
            return rng.choice(options) if options else None
        case "multiple_choice":
            if not options:
                return None
            return rng.sample(options, rng.randint(1, min(2, len(options)))) if q.config.get("multiple") else [rng.choice(options)]
    return None  # file uploads are skipped in generated data


def generate_response(db: Session, form: Form, rng: random.Random | None = None, when=None) -> Response:
    rng = rng or random.Random()
    questions = live_questions(form)
    answers, index = {}, 0 if questions else None
    # Walk the form the way a respondent would, so generated answers respect logic jumps.
    while index is not None:
        q = questions[index]
        answers[str(q.id)] = random_answer(q, rng)
        index = next_index(questions, index, answers.get(str(q.id)))
    response = submit(db, form, None, answers)
    finished = when or now()
    response.completed_at = finished
    response.started_at = finished - timedelta(seconds=rng.randint(35, 240))
    db.commit()
    return response
