"""
add_indexes.py
--------------
Run this ONCE to add all critical performance indexes to the database.
Command: python add_indexes.py
"""

from app import create_app
from extensions import db
from sqlalchemy import text

INDEXES = [
    # Notifications: the most-hit table (polled every 30s per user)
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)",

    # Events: status-based filtering and college/club lookups
    "CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)",
    "CREATE INDEX IF NOT EXISTS idx_events_college_id ON events(college_id)",
    "CREATE INDEX IF NOT EXISTS idx_events_club_id ON events(club_id)",
    "CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date)",
    "CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, event_date)",

    # EventRegistration: duplicate-checking and per-event queries
    "CREATE INDEX IF NOT EXISTS idx_event_regs_student ON event_registrations(student_id)",
    "CREATE INDEX IF NOT EXISTS idx_event_regs_event ON event_registrations(event_id)",
    "CREATE INDEX IF NOT EXISTS idx_event_regs_status ON event_registrations(status)",
    "CREATE INDEX IF NOT EXISTS idx_event_regs_event_status ON event_registrations(event_id, status)",

    # TeamRegistration: per-event team queries
    "CREATE INDEX IF NOT EXISTS idx_team_regs_event_id ON team_registrations(event_id)",
    "CREATE INDEX IF NOT EXISTS idx_team_regs_leader_id ON team_registrations(leader_id)",

    # TeamMember: invite lookup by email and team expansion
    "CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(invited_email)",

    # ClubRole: loaded on every user.to_dict() via club_roles relationship
    "CREATE INDEX IF NOT EXISTS idx_club_roles_user_id ON club_roles(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_club_roles_club_id ON club_roles(club_id)",
    "CREATE INDEX IF NOT EXISTS idx_club_roles_user_club ON club_roles(user_id, club_id)",

    # Users: college and role filtering (used in count queries)
    "CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id)",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)",

    # ActivityLog: per-club and per-college audit retrieval
    "CREATE INDEX IF NOT EXISTS idx_activity_logs_club_id ON activity_logs(club_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_logs_college_id ON activity_logs(college_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)",

    # ClubCoordinator: club lookup
    "CREATE INDEX IF NOT EXISTS idx_club_coordinators_club_id ON club_coordinators(club_id)",
    "CREATE INDEX IF NOT EXISTS idx_club_coordinators_user_id ON club_coordinators(user_id)",

    # Clubs: college lookup
    "CREATE INDEX IF NOT EXISTS idx_clubs_college_id ON clubs(college_id)",
    "CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status)",

    # OTPs: prevent orphaned expiry checks  
    "CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps(identifier)",
    "CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at)",
]


def add_indexes():
    app = create_app()
    with app.app_context():
        added = 0
        failed = 0
        for stmt in INDEXES:
            try:
                with db.engine.connect() as conn:
                    conn.execute(text(stmt))
                    conn.commit()
                index_name = stmt.split("idx_")[1].split(" ")[0]
                print(f"  ✅ idx_{index_name}")
                added += 1
            except Exception as e:
                index_name = stmt.split("IF NOT EXISTS ")[1].split(" ")[0] if "IF NOT EXISTS " in stmt else "unknown"
                print(f"  ⚠️  {index_name}: {e}")
                failed += 1

        print(f"\n{'='*50}")
        print(f"Done: {added} indexes created, {failed} skipped/failed")


if __name__ == "__main__":
    add_indexes()
