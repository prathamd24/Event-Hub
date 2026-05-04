import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app import app
from backend.extensions import db
from backend.models import User, College
from flask_jwt_extended import create_access_token

with app.app_context():
    admin = User.query.filter_by(role="COLLEGE_ADMIN").first()
    if not admin:
        print("Admin not found")
        sys.exit(1)
        
    token = create_access_token(identity={'id': admin.id, 'role': admin.role})
    
    with app.test_client() as client:
        headers = {'Authorization': f'Bearer {token}'}
        data = {
            'location': 'New Location',
            'description': 'Test',
            'establishedYear': '1990',
            'affiliations': '["Test"]'
        }
        res = client.put('/api/college-admin/profile', headers=headers, data=data)
        print("Status Code:", res.status_code)
        print("Response:", res.get_data(as_text=True))
