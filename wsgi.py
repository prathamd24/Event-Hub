"""
WSGI entry point for Render deployment.
Adds the backend/ directory to sys.path so gunicorn can import app.py
even when running from the repository root.
"""
import sys
import os

# Insert backend/ at the front of the module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app  # noqa: E402

application = create_app()
