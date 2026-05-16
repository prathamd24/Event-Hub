from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import firebase_admin
from firebase_admin import credentials
import os
import json

db = SQLAlchemy()
bcrypt = Bcrypt()

# Initialize Firebase Admin
try:
    cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase-admin.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
    else:
        # On Render, we'll pass the JSON as a string in this environment variable
        cred_env = os.environ.get('FIREBASE_CREDENTIALS')
        if not cred_env:
            raise Exception("Neither firebase-admin.json nor FIREBASE_CREDENTIALS env var found.")
        cred_dict = json.loads(cred_env)
        cred = credentials.Certificate(cred_dict)
        
    firebase_app = firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Failed to initialize Firebase Admin: {e}")
    firebase_app = None
