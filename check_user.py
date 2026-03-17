import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app import create_app
from models import User, College
app = create_app()
with app.app_context():
    u = User.query.filter_by(email='eit@gmail.com').first()
    if u:
        try:
            d = u.to_dict()
            print("User to_dict success")
            print(d)
        except Exception as e:
            print(f"User to_dict failure: {e}")
            
        c = u.college
        if c:
            try:
                cd = c.to_dict()
                print("College to_dict success")
                print(cd)
            except Exception as e:
                print(f"College to_dict failure: {e}")
    else:
        print("User not found")
