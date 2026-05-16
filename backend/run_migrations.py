from app import create_app
from extensions import db
from sqlalchemy import text

def run_migrations():
    app = create_app()
    with app.app_context():
        # Custom Categories for Feature 1
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS custom_categories JSON;"))
        
        # Multiple Coordinators Table for Feature 3
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS club_coordinators (
                id SERIAL PRIMARY KEY,
                club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                is_primary BOOLEAN DEFAULT FALSE,
                added_by INTEGER REFERENCES users(id),
                added_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(club_id, user_id)
            );
        """))
        
        # New Social Columns for Feature 6
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS phone VARCHAR(30);"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS twitter VARCHAR(100);"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS linkedin VARCHAR(300);"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS facebook VARCHAR(300);"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS established_year INTEGER;"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS type VARCHAR(100);"))
        db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS naac_grade VARCHAR(10);"))
        
        db.session.commit()
        print("Migrations complete!")

if __name__ == "__main__":
    run_migrations()
