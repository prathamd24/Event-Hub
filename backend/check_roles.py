from app import create_app
from extensions import db
from models import User

app = create_app()
with app.app_context():
    users = User.query.all()
    for u in users:
        print(f"Email: {u.email}, Role: {u.role}, Active: {u.is_active}, Firebase UID: {u.firebase_uid}")
