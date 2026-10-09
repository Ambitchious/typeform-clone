import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def cafe(client):
    return next(f for f in client.get("/api/forms").json() if f["slug"] == "cafe-feedback")


def questions(client, form_id):
    return client.get(f"/api/forms/{form_id}").json()["questions"]


def valid_answers(qs, rating=5):
    by_type = {q["title"]: q for q in qs}
    first = lambda prefix: next(q for t, q in by_type.items() if t.startswith(prefix))  # noqa: E731
    return {
        str(first("Hi there")["id"]): "Srishti",
        str(first("How was the coffee")["id"]): rating,
        str(first("What did you order")["id"]): [first("What did you order")["options"][0]["id"]],
        str(first("Which branch")["id"]): first("Which branch")["options"][1]["id"],
        str(first("Would you recommend")["id"]): "yes",
    }


def test_seed_lists_forms_with_counts(client):
    forms = client.get("/api/forms").json()
    assert {f["title"] for f in forms} >= {"Café Feedback", "Tech Meetup RSVP", "Product Research Survey"}
    assert cafe(client)["response_count"] == 23


def test_draft_and_missing_forms_look_the_same_publicly(client):
    draft = next(f for f in client.get("/api/forms").json() if f["status"] == "draft")
    assert draft["slug"] is None
    assert client.get("/api/public/forms/does-not-exist").status_code == 404


def test_submit_reports_errors_per_question(client):
    form = cafe(client)
    qs = questions(client, form["id"])
    answers = valid_answers(qs)
    email = next(q for q in qs if q["type"] == "email")
    answers[str(email["id"])] = "srishti@"
    answers.pop(str(qs[0]["id"]))
    r = client.post("/api/public/forms/cafe-feedback/responses", json={"answers": answers})
    assert r.status_code == 422
    errors = r.json()["detail"]["errors"]
    assert errors[str(qs[0]["id"])] == "Please fill this in"
    assert "email" in errors[str(email["id"])]


def test_logic_jump_skips_hidden_questions(client):
    qs = questions(client, cafe(client)["id"])
    hidden = next(q for q in qs if q["title"].startswith("Sorry"))
    hidden_required = client.patch(f"/api/questions/{hidden['id']}", json={"required": True})
    assert hidden_required.status_code == 200
    # Rating 5 jumps past the required complaint question, so leaving it empty is fine...
    assert client.post("/api/public/forms/cafe-feedback/responses", json={"answers": valid_answers(qs, 5)}).status_code == 201
    # ...but a rating of 1 shows it, so now it's demanded.
    r = client.post("/api/public/forms/cafe-feedback/responses", json={"answers": valid_answers(qs, 1)})
    assert str(hidden["id"]) in r.json()["detail"]["errors"]
    client.patch(f"/api/questions/{hidden['id']}", json={"required": False})


def test_option_from_another_question_is_rejected(client):
    qs = questions(client, cafe(client)["id"])
    answers = valid_answers(qs)
    branch = next(q for q in qs if q["title"].startswith("Which branch"))
    answers[str(branch["id"])] = next(q for q in qs if q["title"].startswith("What did you order"))["options"][0]["id"]
    r = client.post("/api/public/forms/cafe-feedback/responses", json={"answers": answers})
    assert str(branch["id"]) in r.json()["detail"]["errors"]


def test_renaming_an_option_keeps_its_answers(client):
    form = cafe(client)
    order = next(q for q in questions(client, form["id"]) if q["title"].startswith("What did you order"))
    before = next(s for s in client.get(f"/api/forms/{form['id']}/summary").json()["questions"] if s["id"] == order["id"])
    options = [{"id": o["id"], "label": o["label"]} for o in order["options"]]
    options[0]["label"] = "Cappuccino (large)"
    client.patch(f"/api/questions/{order['id']}", json={"options": options})
    after = next(s for s in client.get(f"/api/forms/{form['id']}/summary").json()["questions"] if s["id"] == order["id"])
    assert after["counts"][0] == {"label": "Cappuccino (large)", "count": before["counts"][0]["count"]}


def test_partial_response_flow_and_token_check(client):
    qs = questions(client, cafe(client)["id"])
    start = client.post("/api/public/forms/cafe-feedback/responses/start").json()
    url = f"/api/public/forms/cafe-feedback/responses/{start['response_id']}/answers/{qs[0]['id']}"
    assert client.put(url, json={"token": "wrong", "value": "Eve"}).status_code == 404
    assert client.put(url, json={"token": start["token"], "value": "Srishti"}).status_code == 204
    done = client.post("/api/public/forms/cafe-feedback/responses",
                       json={"answers": valid_answers(qs), **start})
    assert done.status_code == 201
    assert client.post("/api/public/forms/cafe-feedback/responses", json={"answers": valid_answers(qs), **start}).status_code == 409


def test_choice_saved_partially_then_submitted(client):
    # Regression: re-storing the same option used to INSERT before DELETE and hit the unique constraint.
    qs = questions(client, cafe(client)["id"])
    order = next(q for q in qs if q["title"].startswith("What did you order"))
    start = client.post("/api/public/forms/cafe-feedback/responses/start").json()
    url = f"/api/public/forms/cafe-feedback/responses/{start['response_id']}/answers/{order['id']}"
    for _ in range(2):
        assert client.put(url, json={"token": start["token"], "value": [order["options"][0]["id"]]}).status_code == 204
    done = client.post("/api/public/forms/cafe-feedback/responses", json={"answers": valid_answers(qs), **start})
    assert done.status_code == 201


def test_builder_crud_reorder_publish_duplicate(client):
    form = client.post("/api/forms", json={"title": "Test form"}).json()
    assert client.post(f"/api/forms/{form['id']}/publish").status_code == 400
    a = client.post(f"/api/forms/{form['id']}/questions", json={"type": "short_text", "title": "A"}).json()
    b = client.post(f"/api/forms/{form['id']}/questions", json={"type": "multiple_choice", "title": "B"}).json()
    assert [o["label"] for o in b["options"]] == ["Choice 1", "Choice 2"]
    assert client.put(f"/api/forms/{form['id']}/questions/order", json={"question_ids": [a["id"]]}).status_code == 409
    client.put(f"/api/forms/{form['id']}/questions/order", json={"question_ids": [b["id"], a["id"]]})
    assert [q["title"] for q in questions(client, form["id"])] == ["B", "A"]
    published = client.post(f"/api/forms/{form['id']}/publish").json()
    assert published["status"] == "published" and published["slug"]
    copy = client.post(f"/api/forms/{form['id']}/duplicate").json()
    assert copy["status"] == "draft" and copy["title"] == "Test form (copy)" and len(copy["questions"]) == 2
    assert client.delete(f"/api/forms/{form['id']}").status_code == 204
    assert client.get(f"/api/forms/{form['id']}").status_code == 404


def test_logic_can_only_jump_forward(client):
    qs = questions(client, cafe(client)["id"])
    r = client.patch(f"/api/questions/{qs[3]['id']}", json={"logic_rules": [{"operator": "always", "jump_to_question_id": qs[0]["id"]}]})
    assert r.status_code == 422


def test_csv_export_neutralises_formulas(client):
    qs = questions(client, cafe(client)["id"])
    answers = valid_answers(qs)
    answers[str(qs[0]["id"])] = "=HYPERLINK(\"evil\")"
    client.post("/api/public/forms/cafe-feedback/responses", json={"answers": answers})
    csv = client.get(f"/api/forms/{cafe(client)['id']}/responses/export.csv").text
    assert "'=HYPERLINK" in csv


def test_upload_rejects_path_tricks(client):
    r = client.post("/api/public/forms/cafe-feedback/uploads", files={"file": ("../../etc/passwd", b"x")})
    assert r.status_code == 201 and "/" not in r.json()["name"]
    assert client.get("/api/files/not-a-hex-folder/passwd").status_code == 404


def test_gallery_themes_are_read_only_and_settings_merge(client):
    gallery = client.get("/api/themes").json()[0]
    assert client.put(f"/api/themes/{gallery['id']}", json={**gallery, "name": "Mine"}).status_code == 403
    form_id = cafe(client)["id"]
    assert client.patch(f"/api/forms/{form_id}", json={"theme_id": 999999}).status_code == 422
    before = client.get(f"/api/forms/{form_id}").json()["settings"]
    after = client.patch(f"/api/forms/{form_id}", json={"settings": {"show_progress": False}}).json()["settings"]
    assert after == {**before, "show_progress": False}
