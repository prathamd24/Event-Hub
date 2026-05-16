import sys
import os

# Add parent directory to path to import models and app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models import (
    User, College, Club, Event, EventRegistration, TeamRegistration, 
    Registration, TeamMember, ClubCoordinator, ClubRole, ClubMembership, 
    Notification, Feedback, BroadcastMessage, ActivityLog, OTP
)
import firebase_admin
from firebase_admin import auth as firebase_auth

def cleanup_production():
    app = create_app()
    with app.app_context():
        print("\n\n🚀 Starting Production Data Cleanup...")
        
        # 1. Identify users to delete (all except PLATFORM_ADMIN)
        # We also specifically protect the primary seed admin by email
        admin_emails = ['prathamkumarhr@gmail.com']
        admins = User.query.filter((User.role == 'PLATFORM_ADMIN') | (User.email.in_(admin_emails))).all()
        admin_ids = [a.id for a in admins]
        protected_emails = [a.email for a in admins]
        
        print(f"ℹ️ Protecting {len(admins)} Admin account(s): {', '.join(protected_emails)}")
        
        users_to_delete = User.query.filter(User.id.notin_(admin_ids)).all()
        print(f"🗑️ Found {len(users_to_delete)} test users to remove.")

        # 2. Deleting from Firebase Auth
        print("\n🔥 Removing users from Firebase Auth...")
        for u in users_to_delete:
            if u.firebase_uid:
                try:
                    firebase_auth.delete_user(u.firebase_uid)
                    print(f"   ✅ Deleted Firebase user: {u.email}")
                except Exception as e:
                    # If user doesn't exist in Firebase, it might already be gone
                    if "user-not-found" in str(e).lower():
                        print(f"   ℹ️ User not found in Firebase: {u.email}")
                    else:
                        print(f"   ⚠️ Could not delete Firebase user {u.email}: {e}")

        # 3. Deleting related data in order to satisfy Foreign Key constraints
        try:
            print("\n🧹 Cleaning Database Tables...")
            
            # Simple tables
            for model in [ActivityLog, BroadcastMessage, Feedback, Notification, OTP]:
                print(f"   - {model.__name__}...")
                model.query.delete()
            
            # Relationships
            print("   - ClubMemberships & Roles...")
            ClubMembership.query.delete()
            ClubRole.query.delete()
            
            # Event related
            print("   - Team Registrations & Members...")
            TeamMember.query.delete()
            TeamRegistration.query.delete()
            
            print("   - Event Registrations & Registrations...")
            EventRegistration.query.delete()
            Registration.query.delete()
            
            print("   - Events...")
            Event.query.delete()
            
            # Club related
            print("   - Club Coordinators...")
            ClubCoordinator.query.delete()
            
            print("   - Clubs...")
            # Note: We filter out protected users' link to clubs if any, 
            # but usually they aren't linked.
            Club.query.delete()
            
            print("   - Colleges...")
            College.query.delete()
            
            # Finally, original users
            print("   - Users (Test accounts)...")
            User.query.filter(User.id.notin_(admin_ids)).delete(synchronize_session=False)
            
            db.session.commit()
            print("\n✨✨ PRODUCTION CLEANUP COMPLETED SUCCESSFULLY! ✨✨")
            print("Your live website is now clean and ready for real users.")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ ERROR DURING CLEANUP: {e}")
            raise

if __name__ == "__main__":
    # Ensure this is intentional
    print("\n" + "!" * 50)
    print("WARNING: This will PERMANENTLY DELETE ALL DATA on the hosted website.")
    print("Only Platform Admin accounts will be preserved.")
    print("!" * 50)
    
    confirm = input("\nType 'CONFIRM' to proceed with the deletion: ")
    if confirm == "CONFIRM":
        cleanup_production()
    else:
        print("\n❌ Cleanup cancelled.")
