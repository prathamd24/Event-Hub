from extensions import db
from models import ActivityLog, Notification, ClubCoordinator, Club

def log_activity(club_id=None, college_id=None, actor_id=None, action="", details=""):
    try:
        # Resolve college_id from club if not provided
        resolved_college_id = college_id
        if club_id and not resolved_college_id:
            club = Club.query.get(club_id)
            if club:
                resolved_college_id = club.college_id

        log = ActivityLog(
            club_id=club_id,
            college_id=resolved_college_id,
            actor_id=actor_id,
            action=action,
            details=details
        )
        db.session.add(log)

        # Notify all coordinators of this club (except the actor themselves)
        if club_id:
            icon = "🔔"
            if "EVENT" in action.upper():
                icon = "📅"
            elif "CLUB" in action.upper():
                icon = "🏛️"
            elif "BROADCAST" in action.upper():
                icon = "📢"
            elif "REGISTRATION" in action.upper():
                icon = "✍️"

            readable_action = action.replace("_", " ").title()
            coords = ClubCoordinator.query.filter_by(club_id=club_id).all()
            for coord in coords:
                if coord.user_id == actor_id:
                    continue  # Don't notify the person who made the change
                notif = Notification(
                    user_id=coord.user_id,
                    title=f"{icon} Club Activity: {readable_action}",
                    message=details or readable_action,
                    type="ACTIVITY",
                    link="/club/dashboard",
                    is_read=False
                )
                db.session.add(notif)

    except Exception as e:
        print(f"Logging error: {e}")

