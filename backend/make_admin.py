import sys
import os

# Ensure the backend directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import User

def make_admin(email):
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.role = 'PLATFORM_ADMIN'
            db.session.commit()
            print(f"✅ Success! Updated existing user '{email}' to PLATFORM_ADMIN.")
        else:
            # Create a new user if they don't exist yet
            new_user = User(
                name='Pratham Kumar', 
                email=email, 
                role='PLATFORM_ADMIN', 
                is_active=True, 
                password_hash='firebase_managed'
            )
            db.session.add(new_user)
            db.session.commit()
            print(f"✅ Success! Created new user '{email}' as PLATFORM_ADMIN.")

if __name__ == '__main__':
    make_admin('prathamkumarhr@gmail.com')
