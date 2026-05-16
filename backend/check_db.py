from app import create_app
from models import User, College
import json

app = create_app()
with app.app_context():
    admin = User.query.filter_by(email='eit@gmail.com').first()
    if admin and admin.college:
        college = admin.college
        print(f"College ID: {college.id}")
        print(f"Name: {college.name}")
        print(f"Logo URL: {college.logo_url}")
        print(f"Banner URL: {college.banner_url}")
    else:
        print("Admin or College not found")
