from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

from extensions import db, bcrypt

# ── Rate Limiter (shared across blueprints) ─────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],          # no global limit; we add per-route limits
    storage_uri="memory://",    # swap to redis:// in production
)


def run_migrations(app):
    with app.app_context():
        db.create_all()
        try:
            from sqlalchemy import text
            db.session.execute(text("""
                ALTER TABLE event_registrations
                ADD CONSTRAINT IF NOT EXISTS unique_event_student
                UNIQUE (event_id, student_id);
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                # Table: events
                for column, col_type in [
                    ('cover_url', 'VARCHAR(300)'),
                    ('end_date', 'DATE'),
                    ('themes', 'JSON'),
                    ('prizes', 'JSON'),
                    ('eligibility', 'TEXT'),
                    ('event_photos', 'JSON'),
                    ('topics', 'JSON'),
                    ('highlights', 'JSON'),
                    ('chief_guests', 'JSON'),
                    ('judges', 'JSON'),
                    ('event_scope', "VARCHAR(20) DEFAULT 'INTRA'"),
                    ('venue_map_link', 'VARCHAR(500)'),
                    ('payment_qr_url', 'VARCHAR(500)'),
                    ('upi_id', 'VARCHAR(200)'),
                    ('upi_name', 'VARCHAR(100)'),
                    ('payment_qr', 'VARCHAR(500)'),
                    ('organized_by', "VARCHAR(20) DEFAULT 'COLLEGE'"),
                    ('participation_type', "VARCHAR(20) DEFAULT 'INDIVIDUAL'"),
                    ('min_team_size', 'INTEGER DEFAULT 1'),
                    ('max_team_size', 'INTEGER DEFAULT 1'),
                    ('max_teams', 'INTEGER'),
                    ('registration_type', "VARCHAR(20) DEFAULT 'INDIVIDUAL'"),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE events ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                    except Exception:
                        pass

                try:
                    conn.execute(text("UPDATE events SET registration_type = 'INDIVIDUAL' WHERE registration_type IS NULL"))
                    conn.commit()
                except Exception:
                    conn.rollback()

                # Table: clubs
                for column, col_type in [
                    ('cover_url', 'VARCHAR(300)'),
                    ('gallery', 'TEXT'),
                    ('logo_url', 'VARCHAR(500)'),
                    ('instagram', 'VARCHAR(200)'),
                    ('club_photos', 'JSON'),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE clubs ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                        conn.commit()
                    except Exception:
                        conn.rollback()

                # Table: colleges
                for column, col_type in [
                    ('instagram', 'VARCHAR(200)'),
                    ('affiliation', 'VARCHAR(300)'),
                    ('affiliations', 'JSON'),
                    ('custom_categories', 'JSON'),
                    ('college_photos', 'JSON'),
                    ('contact_email', 'VARCHAR(200)'),
                    ('phone', 'VARCHAR(30)'),
                    ('twitter', 'VARCHAR(100)'),
                    ('linkedin', 'VARCHAR(300)'),
                    ('facebook', 'VARCHAR(300)'),
                    ('established_year', 'INTEGER'),
                    ('type', 'VARCHAR(100)'),
                    ('naac_grade', 'VARCHAR(10)'),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE colleges ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                        conn.commit()
                    except Exception:
                        conn.rollback()

                # Table: users
                for column, col_type in [
                    ('volunteer_points', 'INTEGER DEFAULT 0'),
                    ('volunteer_badges', 'JSON'),
                    ('college_name_manual', 'VARCHAR(200)'),
                    ('google_auth', 'BOOLEAN DEFAULT FALSE'),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                        conn.commit()
                    except Exception:
                        conn.rollback()

                # Table: event_registrations
                for column, col_type in [
                    ('team_name', 'VARCHAR(200)'),
                    ('team_members', 'JSON'),
                    ('payment_ref', 'VARCHAR(200)'),
                    ('rejection_reason', 'TEXT'),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                        conn.commit()
                    except Exception:
                        conn.rollback()

                # Table: team_registrations
                for column, col_type in [
                    ('leader_payment_status', "VARCHAR(20) DEFAULT 'UNPAID'"),
                    ('leader_payment_ref', 'VARCHAR(200)'),
                    ('payment_screenshot', 'VARCHAR(500)'),
                    ('leader_payment_screenshot', 'VARCHAR(500)'),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE team_registrations ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                        conn.commit()
                    except Exception:
                        conn.rollback()

                for column, col_type in [
                    ('payment_status', "VARCHAR(20) DEFAULT 'UNPAID'"),
                    ('payment_ref', 'VARCHAR(200)'),
                    ('payment_screenshot', 'VARCHAR(500)'),
                    ('paid_at', 'TIMESTAMP'),
                ]:
                    try:
                        conn.execute(text(
                            f'ALTER TABLE team_members ADD COLUMN IF NOT EXISTS {column} {col_type}'
                        ))
                        conn.commit()
                    except Exception:
                        conn.rollback()

                try:
                    db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS affiliations JSON"))
                    db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS college_photos JSON"))
                    db.session.execute(text("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS custom_categories JSON"))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

                # platform_events telemetry table
                # Note: SERIAL and TIMESTAMP are PostgreSQL syntax (not SQLite)
                try:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS platform_events (
                            id SERIAL PRIMARY KEY,
                            event_type VARCHAR(100) NOT NULL,
                            entity_type VARCHAR(50),
                            entity_id INTEGER,
                            user_id INTEGER REFERENCES users(id),
                            college_id INTEGER REFERENCES colleges(id),
                            extra_data JSON,
                            ip_address VARCHAR(50),
                            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    conn.execute(text('CREATE INDEX IF NOT EXISTS ix_platform_events_event_type ON platform_events (event_type)'))
                    conn.execute(text('CREATE INDEX IF NOT EXISTS ix_platform_events_timestamp ON platform_events (timestamp)'))
                    conn.commit()
                    print('[Migration] platform_events table ready')
                except Exception as e:
                    print(f'[Migration] platform_events: {e}')
                    conn.rollback()

                # notifications table
                try:
                    conn.execute(text('''
                        CREATE TABLE IF NOT EXISTS notifications (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(id),
                            title VARCHAR(200) NOT NULL,
                            message TEXT NOT NULL,
                            type VARCHAR(50) DEFAULT 'INFO',
                            link VARCHAR(500),
                            is_read BOOLEAN DEFAULT FALSE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    '''))
                    conn.execute(text('CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)'))
                    conn.execute(text('CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications (is_read)'))
                    conn.commit()
                    print('[Migration] notifications table ready')
                except Exception as e:
                    print(f'[Migration] notifications: {e}')
                    conn.rollback()

                # ── Cleanup: remove DB users whose Firebase account was deleted ────
                # These users exist in DB but are gone from Firebase;
                # they will re-register fresh with correct college info.
                try:
                    orphaned_emails = [
                        '24-cse-ds-016hunny@eitfaridabad.co.in',
                        '24-cse-ds-034pratham@eitfaridabad.co.in',
                    ]
                    deleted = conn.execute(
                        text("DELETE FROM users WHERE email = ANY(:emails) AND role = 'STUDENT'"),
                        {'emails': orphaned_emails}
                    )
                    conn.commit()
                    print(f'[Cleanup] Removed {deleted.rowcount} orphaned student account(s)')
                except Exception as e:
                    print(f'[Cleanup] orphaned users: {e}')
                    conn.rollback()

                # ── Cleanup: fix users whose college_name_manual was set to their email ──
                try:
                    conn.execute(text("""
                        UPDATE users
                        SET college_name_manual = NULL
                        WHERE college_name_manual IS NOT NULL
                          AND college_name_manual LIKE '%@%'
                    """))
                    conn.commit()
                    print('[Cleanup] Fixed email-as-college_name_manual entries')
                except Exception as e:
                    print(f'[Cleanup] email-as-college fix: {e}')
                    conn.rollback()

        except Exception as e:
            print(f'Migration script error: {e}')
        seed_platform_admin()


def auto_update_event_statuses(app=None):
    """
    Background task: auto-update event statuses based on current date.
    Runs via APScheduler every 5 minutes — NOT on every request.
    """
    from models import Event
    from datetime import date
    ctx = app.app_context() if app else None
    try:
        if ctx:
            ctx.push()
        today = date.today()

        expired = Event.query.filter(
            Event.status.in_(["UPCOMING", "ONGOING"])
        ).all()

        changed = False
        for event in expired:
            event_end = getattr(event, "end_date", None) or event.event_date
            if not event_end:
                continue
            if event_end < today:
                event.status = "COMPLETED"
                changed = True
            elif event.event_date and event.event_date == today and event.status == "UPCOMING":
                event.status = "ONGOING"
                changed = True

        if changed:
            db.session.commit()
            print("[Scheduler] Event statuses updated")
    except Exception as e:
        db.session.rollback()
        print(f"[Scheduler] Auto status update error: {e}")
    finally:
        if ctx:
            ctx.pop()


def cleanup_expired_otps(app=None):
    """Hourly job: delete expired OTPs so the table doesn't grow unbounded."""
    from models import OTP
    from datetime import datetime
    ctx = app.app_context() if app else None
    try:
        if ctx:
            ctx.push()
        deleted = OTP.query.filter(OTP.expires_at < datetime.utcnow()).delete()
        db.session.commit()
        if deleted:
            print(f"[Scheduler] Cleaned up {deleted} expired OTPs")
    except Exception as e:
        db.session.rollback()
        print(f"[Scheduler] OTP cleanup error: {e}")
    finally:
        if ctx:
            ctx.pop()

def sync_firebase_users(app=None):
    """
    Background task: sync Firebase Auth state → DB every 5 minutes.
    - User deleted in Firebase  → delete from DB
    - User disabled in Firebase → set is_active = False in DB
    - User re-enabled in Firebase → set is_active = True in DB
    """
    ctx = app.app_context() if app else None
    try:
        if ctx:
            ctx.push()

        import firebase_admin
        from firebase_admin import auth as firebase_auth

        # Build a map of {email → firebase_user} from Firebase
        fb_map = {}  # email → {'disabled': bool}
        page = firebase_auth.list_users()
        while page:
            for fb_user in page.users:
                if fb_user.email:
                    fb_map[fb_user.email.lower()] = {
                        'uid': fb_user.uid,
                        'disabled': fb_user.disabled,
                    }
            page = page.get_next_page()

        # Get all non-platform-admin DB users that use Firebase auth
        firebase_db_users = User.query.filter(
            User.role != 'PLATFORM_ADMIN',
            User.password_hash == 'FIREBASE_AUTH'
        ).all()

        deleted_count  = 0
        disabled_count = 0
        enabled_count  = 0

        for user in firebase_db_users:
            email = (user.email or '').lower()
            fb    = fb_map.get(email)

            if fb is None:
                # User was deleted from Firebase — remove from DB too
                db.session.delete(user)
                deleted_count += 1
            elif fb['disabled'] and user.is_active:
                # Disabled in Firebase → deactivate in DB
                user.is_active = False
                disabled_count += 1
            elif not fb['disabled'] and not user.is_active:
                # Re-enabled in Firebase → activate in DB
                user.is_active = True
                enabled_count += 1

        if deleted_count or disabled_count or enabled_count:
            db.session.commit()
            print(
                f'[Firebase Sync] deleted={deleted_count} '
                f'deactivated={disabled_count} reactivated={enabled_count}'
            )
        else:
            print('[Firebase Sync] All users in sync ✓')

    except Exception as e:
        db.session.rollback()
        print(f'[Firebase Sync] Error: {e}')
    finally:
        if ctx:
            ctx.pop()


def start_scheduler(app):
    """Start APScheduler to run background jobs every 5 minutes."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(
            func=auto_update_event_statuses,
            kwargs={"app": app},
            trigger="interval",
            minutes=5,
            id="event_status_updater",
            replace_existing=True,
        )
        scheduler.add_job(
            func=cleanup_expired_otps,
            kwargs={"app": app},
            trigger="interval",
            hours=1,
            id="otp_cleanup",
            replace_existing=True,
        )
        scheduler.add_job(
            func=sync_firebase_users,
            kwargs={"app": app},
            trigger="interval",
            minutes=5,
            id="firebase_user_sync",
            replace_existing=True,
        )
        scheduler.start()
        print("[Scheduler] APScheduler started — event statuses + Firebase sync every 5 minutes")
        return scheduler
    except Exception as e:
        print(f"[Scheduler] Failed to start: {e}")
        return None


def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)

    # ── CORS — restrict to known origins only ──────────────────────────────
    allowed_origins = [
        "https://event-hub-8fe51.web.app",
        "https://event-hub-8fe51.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:5174",
    ]
    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        max_age=600,
    )

    from routes.auth import auth_bp
    from routes.public import public_bp
    from routes.platform_admin import platform_admin_bp
    from routes.college_admin import college_admin_bp
    from routes.club_coordinator import club_coordinator_bp
    from routes.student import student_bp
    from routes.otp import otp_bp
    from routes.notifications import notifications_bp
    from routes.registration import registration_bp
    from routes.team_registration import team_bp
    from routes.student_coordinator import sc_bp
    from routes.feedback import feedback_bp
    from routes.telemetry import telemetry_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(public_bp, url_prefix='/api/public')
    app.register_blueprint(platform_admin_bp, url_prefix='/api/platform-admin')
    app.register_blueprint(college_admin_bp, url_prefix='/api/college-admin')
    app.register_blueprint(club_coordinator_bp, url_prefix='/api/club')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(otp_bp, url_prefix='/api/otp')
    app.register_blueprint(notifications_bp, url_prefix='/api')
    app.register_blueprint(registration_bp, url_prefix='/api')
    app.register_blueprint(team_bp, url_prefix='/api')
    app.register_blueprint(sc_bp, url_prefix='/api/sc')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(telemetry_bp, url_prefix='/api/telemetry')

    @app.route('/')
    def health_check():
        return jsonify({"status": "ok", "message": "Event Hub API is running"}), 200

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(
            os.path.join(app.root_path, app.config['UPLOAD_FOLDER']),
            filename
        )

    # Manual trigger (kept for backward compat / admin tooling)
    @app.route("/api/admin/sync-event-statuses", methods=["POST"])
    def sync_statuses():
        auto_update_event_statuses()
        return jsonify({"message": "Statuses synced"}), 200

    # ── NOTE: before_request hook REMOVED ──────────────────────────────────
    # auto_update_event_statuses() was previously called on EVERY request.
    # It is now handled by APScheduler every 5 minutes (see start_scheduler).

    if os.environ.get('RUN_MIGRATIONS') == 'true' or os.environ.get('FLASK_ENV') == 'development':
        run_migrations(app)
    else:
        with app.app_context():
            db.create_all()
            seed_platform_admin()

    # ── Start background scheduler ──────────────────────────────────────────
    @app.errorhandler(500)
    def handle_500(e):
        import traceback
        return jsonify({
            "error": "Internal Server Error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        return jsonify({
            "error": "Unhandled Exception",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

    return app



def create_notification(user_id, title, message, type_, link=None):
    from models import Notification
    try:
        notif = Notification(
            user_id=user_id, title=title,
            message=message, type=type_, link=link
        )
        db.session.add(notif)
        print(f"Notification created for user {user_id}: {title}")
    except Exception as e:
        print(f"Error creating notification: {e}")


def seed_platform_admin():
    from models import User, College
    PLATFORM_ADMIN_EMAIL = 'prathamkumarhr@gmail.com'
    EIT_ADMIN_EMAIL      = 'eit@gmail.com'
    EIT_COLLEGE_NAME     = 'Echelon Institute of Technology Faridabad'

    # ── 1. Ensure the one true platform admin exists ───────────────────────
    admin = User.query.filter_by(email=PLATFORM_ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            name='Pratham Kumar',
            email=PLATFORM_ADMIN_EMAIL,
            password_hash='FIREBASE_AUTH',
            role='PLATFORM_ADMIN',
            is_active=True,
            college_id=None
        )
        db.session.add(admin)
        print(f'[Seed] Platform Admin created: {PLATFORM_ADMIN_EMAIL}')
    else:
        if admin.role != 'PLATFORM_ADMIN' or admin.college_id is not None:
            admin.role = 'PLATFORM_ADMIN'
            admin.college_id = None
            print(f'[Seed] Platform Admin role fixed: {PLATFORM_ADMIN_EMAIL}')

    # ── 2. Demote any rogue PLATFORM_ADMINs (skip EIT admin) ──────────────
    rogue = User.query.filter(
        User.role == 'PLATFORM_ADMIN',
        User.email != PLATFORM_ADMIN_EMAIL
    ).all()
    for u in rogue:
        # If this is the EIT college admin, set it correctly instead of just demoting
        if u.email == EIT_ADMIN_EMAIL:
            u.role = 'COLLEGE_ADMIN'
            print(f'[Seed] Fixed EIT admin role: {u.email} → COLLEGE_ADMIN')
        else:
            u.role = 'STUDENT'
            print(f'[Seed] Demoted rogue PLATFORM_ADMIN → STUDENT: {u.email}')

    # ── 3. Ensure Echelon Institute of Technology Faridabad exists ─────────
    db.session.flush()
    college = College.query.filter(College.name.ilike(EIT_COLLEGE_NAME)).first()
    if not college:
        college = College(
            name=EIT_COLLEGE_NAME,
            location='Faridabad, Haryana',
            status='APPROVED',
            is_verified=True
        )
        db.session.add(college)
        db.session.flush()
        print(f'[Seed] College created: {EIT_COLLEGE_NAME}')
    else:
        if college.status != 'APPROVED':
            college.status = 'APPROVED'
            college.is_verified = True
            print(f'[Seed] College approved: {EIT_COLLEGE_NAME}')

    # ── 4. Ensure eit@gmail.com is COLLEGE_ADMIN of EIT ───────────────────
    eit_admin = User.query.filter_by(email=EIT_ADMIN_EMAIL).first()
    if not eit_admin:
        eit_admin = User(
            name='EIT Admin',
            email=EIT_ADMIN_EMAIL,
            password_hash='FIREBASE_AUTH',
            role='COLLEGE_ADMIN',
            is_active=True,
            college_id=college.id
        )
        db.session.add(eit_admin)
        db.session.flush()
        print(f'[Seed] EIT College Admin created: {EIT_ADMIN_EMAIL}')
    else:
        fixed = False
        if eit_admin.role != 'COLLEGE_ADMIN':
            eit_admin.role = 'COLLEGE_ADMIN'
            fixed = True
        if eit_admin.college_id != college.id:
            eit_admin.college_id = college.id
            fixed = True
        if fixed:
            print(f'[Seed] EIT College Admin role/college fixed: {EIT_ADMIN_EMAIL}')

    # Ensure college has admin_id set
    if college.admin_id != eit_admin.id:
        college.admin_id = eit_admin.id

    db.session.commit()





if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', debug=True, port=port)
