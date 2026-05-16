import sys
import os

# Add the backend folder to Python's path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app import create_app

application = create_app()

if __name__ == "__main__":
    application.run()
