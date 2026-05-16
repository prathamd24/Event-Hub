from app import create_app
from extensions import db
from sqlalchemy import text

def nuke():
    app = create_app()
    with app.app_context():
        print("Starting safe data nuke (Raw SQL mode)...")
        try:
            admin_emails = ['prathamkumarhr@gmail.com', 'eit@gmail.com']
            
            # Use raw SQL to clear all data
            # Note: The order matters to avoid fk issues, or we can use CASCADE if available
            
            print("Clearing all tables except users...")
            tables = [
                'team_members', 'team_registrations', 'event_registrations', 
                'registrations', 'notifications', 'club_roles', 
                'club_coordinators', 'club_memberships', 'broadcast_messages', 
                'activity_logs', 'feedback', 'platform_events', 'otps',
                'events', 'clubs', 'colleges'
            ]
            
            for table in tables:
                try:
                    db.session.execute(text(f"DELETE FROM {table}"))
                    print(f"Cleared table: {table}")
                except Exception as e:
                    print(f"Warning: Could not clear table {table}: {e}")
            
            print("Cleaning up non-admin users...")
            # Use tuple for SQL IN clause
            admin_emails_tuple = tuple(admin_emails)
            # Ensure admin users have no lingering FKs to clubs/colleges
            db.session.execute(text(
                "UPDATE users SET college_id = NULL, club_id = NULL WHERE email IN :emails"
            ), {"emails": admin_emails_tuple})
            
            # Delete non-admins
            result = db.session.execute(text(
                "DELETE FROM users WHERE email NOT IN :emails"
            ), {"emails": admin_emails_tuple})
            
            db.session.commit()
            print(f"Nuke successful! Deleted {result.rowcount} non-admin users.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during nuke: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    nuke()
