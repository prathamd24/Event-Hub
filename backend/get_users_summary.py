import sys
import os

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from app import create_app
from extensions import db
from models import User, College

def main():
    app = create_app()
    with app.app_context():
        print("--- USER SUMMARY ---")
        users = User.query.all()
        for u in users:
            college_status = u.college.status if u.college else "N/A"
            college_name = u.college.name if u.college else "N/A"
            print(f"Email: {u.email}")
            print(f"  Role: {u.role}")
            print(f"  Active: {u.is_active}")
            print(f"  College: {college_name} (Status: {college_status})")
            print(f"  Firebase UID: {u.firebase_uid}")
            print("-" * 20)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
