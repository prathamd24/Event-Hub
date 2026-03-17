from app import create_app
from models import College
from extensions import db

app = create_app()
with app.app_context():
    colleges = College.query.all()
    print(f"Total colleges found: {len(colleges)}")
    for c in colleges:
        print(f"ID: {c.id}, Name: {c.name}, Status: {c.status}")
