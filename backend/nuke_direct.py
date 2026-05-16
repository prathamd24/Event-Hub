import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def nuke_ultimate():
    db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres123@localhost/college_event_hub')
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(db_url)
    admin_emails = ('prathamkumarhr@gmail.com', 'eit@gmail.com')
    
    # Tables to truncate (with CASCADE)
    # We include the main entities; CASCADE will find their dependents.
    # Note: We do NOT truncate 'users' because we want to preserve some rows.
    tables_to_truncate = [
        'colleges', 'clubs', 'events', 'registrations', 
        'event_registrations', 'team_registrations', 'team_members',
        'notifications', 'club_roles', 'club_coordinators', 
        'club_memberships', 'broadcast_messages', 'activity_logs', 
        'feedback', 'platform_events', 'otps'
    ]
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Step 1: Clearing user-to-org references...")
            conn.execute(text("UPDATE users SET college_id = NULL, club_id = NULL"))
            
            print("Step 2: Truncating all entities with CASCADE...")
            # TRUNCATE is faster and handles dependencies better than DELETE if we use CASCADE
            tables_str = ", ".join(tables_to_truncate)
            conn.execute(text(f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE"))
            
            print("Step 3: Deleting non-admin users...")
            res = conn.execute(text(
                "DELETE FROM users WHERE email NOT IN :emails"
            ), {"emails": admin_emails})
            
            print(f"Deleted {res.rowcount} non-admin users.")
            trans.commit()
            print("Nuke successful!")
        except Exception as e:
            trans.rollback()
            print(f"Nuke failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    nuke_ultimate()
