from app import create_app
from extensions import db
from models import User

app = create_app()
with app.app_context():
    u = User.query.filter_by(email='eit@gmail.com').first()
    if u:
        print(f"DEBUG_USER: email={u.email}, role={u.role}, college_id={u.college_id}")
    else:
        print("DEBUG_USER: Not found")
