import sys
import os
sys.path.append(os.path.abspath('backend'))
from app import create_app
from models import User

def check():
    app = create_app()
    with app.app_context():
        u = User.query.filter_by(email='eit@gmail.com').first()
        if u:
            print(f"Email: {u.email}")
            print(f"Role: {u.role}")
            print(f"Active: {u.is_active}")
            print(f"College: {u.college.name if u.college else 'None'}")
            print(f"College Status: {u.college.status if u.college else 'N/A'}")
        else:
            print("User eit@gmail.com not found")

if __name__ == '__main__':
    check()
