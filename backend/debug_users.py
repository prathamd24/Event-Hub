from app import create_app
from extensions import db
from models import User

def debug_users():
    app = create_app()
    with app.app_context():
        users = User.query.all()
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"ID: {u.id}, Email: '{u.email}', Role: {u.role}, CollegeID: {u.college_id}")

if __name__ == "__main__":
    debug_users()
