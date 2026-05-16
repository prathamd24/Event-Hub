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
        email = 'eit@gmail.com'
        user = User.query.filter_by(email=email).first()
        if user:
            print(f"Found user: {user.email}")
            print(f"Current role: {user.role}")
            print(f"Current college ID: {user.college_id}")
            
            # Fix role to STUDENT if it's not
            if user.role != 'STUDENT':
                user.role = 'STUDENT'
                print(f"Updated role to STUDENT")
            
            # Ensure user is active
            user.is_active = True
            
            # Check college status if it exists
            if user.college:
                print(f"Current college status: {user.college.status}")
                if user.college.status != 'APPROVED':
                    user.college.status = 'APPROVED'
                    print(f"Updated college status to APPROVED")
            else:
                print("No college associated with this user.")
                
            db.session.commit()
            print("Changes committed successfully.")
        else:
            print(f"User with email {email} not found.")

if __name__ == "__main__":
    main()
