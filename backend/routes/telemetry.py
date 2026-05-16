from flask import Blueprint, request, jsonify
from middleware.auth_middleware import get_jwt_identity, role_required
from extensions import db
from models import PlatformEvent, User, College
from datetime import datetime, timedelta
from sqlalchemy import text, func
import os
import json

telemetry_bp = Blueprint('telemetry', __name__)

# ─── Helpers ────────────────────────────────────────────────────────────────

def _get_ip():
    x_forward = request.headers.get('X-Forwarded-For')
    if x_forward:
        return x_forward.split(',')[0].strip()
    return request.remote_addr


def _get_current_user_id():
    """Extract user_id from JWT if present, else None. Never raises."""
    try:
        return get_jwt_identity()
    except Exception:
        return None


# ─── POST /ingest — open endpoint, no auth required ─────────────────────────
@telemetry_bp.route('/ingest', methods=['POST'])
def ingest_event():
    """
    Accepts telemetry events from the frontend.
    Open to all (guests + logged-in users) so we can track everyone.
    Silently succeeds even on bad data.
    """
    try:
        data = request.get_json(silent=True) or {}
        event_type  = str(data.get('event_type', 'UNKNOWN'))[:100]
        entity_type = str(data.get('entity_type', ''))[:50] if data.get('entity_type') else None
        entity_id   = int(data['entity_id']) if data.get('entity_id') else None
        college_id  = int(data['college_id']) if data.get('college_id') else None
        extra_data  = data.get('extra_data') if isinstance(data.get('extra_data'), dict) else {}
        user_id     = _get_current_user_id()

        ev = PlatformEvent(
            event_type  = event_type,
            entity_type = entity_type,
            entity_id   = entity_id,
            user_id     = user_id,
            college_id  = college_id,
            extra_data  = extra_data,
            ip_address  = _get_ip(),
        )
        db.session.add(ev)
        db.session.commit()
    except Exception:
        # silent fail — never let telemetry break the user experience
        pass

    return jsonify({'ok': True}), 201


# ─── GET /live-feed — PLATFORM_ADMIN only ───────────────────────────────────
@telemetry_bp.route('/live-feed', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def live_feed():
    """Return the 200 most recent platform events with enriched user info."""
    events = (
        PlatformEvent.query
        .order_by(PlatformEvent.timestamp.desc())
        .limit(200)
        .all()
    )
    return jsonify([e.to_dict() for e in events]), 200


# ─── GET /stats — PLATFORM_ADMIN only ───────────────────────────────────────
@telemetry_bp.route('/stats', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_stats():
    """
    Aggregated analytics (PostgreSQL-compatible).
    """
    try:
        now = datetime.utcnow()
        day7_ago  = now - timedelta(days=7)
        day14_ago = now - timedelta(days=14)

        by_type_rows = (
            db.session.query(
                PlatformEvent.event_type,
                func.count(PlatformEvent.id).label('count')
            )
            .filter(PlatformEvent.timestamp >= day7_ago)
            .group_by(PlatformEvent.event_type)
            .order_by(func.count(PlatformEvent.id).desc())
            .all()
        )
        events_by_type = [{'name': r.event_type, 'value': r.count} for r in by_type_rows]

        # PostgreSQL: DATE_TRUNC + TO_CHAR
        by_day_rows = db.session.execute(text("""
            SELECT TO_CHAR(DATE_TRUNC('day', timestamp), 'YYYY-MM-DD') as day, COUNT(*) as cnt
            FROM platform_events
            WHERE timestamp >= :since
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY day ASC
        """), {'since': day14_ago.isoformat()}).fetchall()
        events_by_day = [{'date': r[0], 'events': r[1]} for r in by_day_rows]

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        total_today = PlatformEvent.query.filter(PlatformEvent.timestamp >= today_start).count()
        total_7d = PlatformEvent.query.filter(PlatformEvent.timestamp >= day7_ago).count()
        unique_users_7d = (
            db.session.query(func.count(func.distinct(PlatformEvent.user_id)))
            .filter(PlatformEvent.timestamp >= day7_ago, PlatformEvent.user_id != None)
            .scalar() or 0
        )

        # PostgreSQL: ->> json operator
        page_view_rows = db.session.execute(text("""
            SELECT extra_data->>'page' as page, COUNT(*) as cnt
            FROM platform_events
            WHERE event_type = 'PAGE_VIEW'
              AND timestamp >= :since
              AND extra_data->>'page' IS NOT NULL
            GROUP BY extra_data->>'page'
            ORDER BY cnt DESC
            LIMIT 10
        """), {'since': day7_ago.isoformat()}).fetchall()
        top_pages = [{'page': r[0], 'views': r[1]} for r in page_view_rows]

        college_rows = (
            db.session.query(College.name, func.count(PlatformEvent.id).label('cnt'))
            .join(PlatformEvent, PlatformEvent.college_id == College.id)
            .filter(PlatformEvent.timestamp >= day7_ago)
            .group_by(College.id, College.name)
            .order_by(func.count(PlatformEvent.id).desc())
            .limit(8).all()
        )
        top_colleges = [{'name': r[0], 'value': r[1]} for r in college_rows]

        return jsonify({
            'totalToday':    total_today,
            'total7d':       total_7d,
            'uniqueUsers7d': unique_users_7d,
            'eventsByType':  events_by_type,
            'eventsByDay':   events_by_day,
            'topPages':      top_pages,
            'topColleges':   top_colleges,
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'totalToday': 0, 'total7d': 0, 'uniqueUsers7d': 0,
            'eventsByType': [], 'eventsByDay': [], 'topPages': [], 'topColleges': [],
            'error': str(e)
        }), 200



# ─── POST /ask — AI natural-language query engine ───────────────────────────
@telemetry_bp.route('/ask', methods=['POST'])
@role_required('PLATFORM_ADMIN')
def ask_ai():
    """
    Convert a plain-English question into a safe SQLite SELECT query using
    Google Gemini, execute it, and return the results.
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'error': 'AI not configured — set GEMINI_API_KEY in environment.'}), 503

    data = request.get_json(silent=True) or {}
    question = str(data.get('question', '')).strip()
    if not question:
        return jsonify({'error': 'No question provided.'}), 400

    # --- Build the AI prompt ---
    schema_info = """
Database: SQLite — Event Hub platform
Tables:
  users(id, name, email, role, college_id, club_id, is_active, created_at)
    role values: STUDENT, COLLEGE_ADMIN, CLUB_COORDINATOR, PLATFORM_ADMIN
  colleges(id, name, location, status, is_verified, created_at)
    status values: PENDING, APPROVED, REJECTED, SUSPENDED
  clubs(id, name, category, status, college_id, coordinator_id, created_at)
  events(id, title, category, venue, status, college_id, club_id, event_date,
         current_registrations, max_participants, registration_fee, created_at)
    status values: UPCOMING, ONGOING, COMPLETED, CANCELLED
  event_registrations(id, event_id, student_id, status, registered_at)
    status values: PENDING, VERIFIED, REJECTED
  team_registrations(id, event_id, team_name, leader_id, status, created_at)
  platform_events(id, event_type, entity_type, entity_id, user_id, college_id, extra_data, timestamp)
    event_type examples: PAGE_VIEW, LOGIN, REGISTRATION, EVENT_VIEW, CLUB_VIEW, SEARCH, FEEDBACK_SUBMITTED
  feedback(id, user_id, rating, comment, created_at)
    rating: 1-5
"""
    system_prompt = (
        "You are a SQLite expert. Convert the user's question into a safe SQLite SELECT query. "
        "RULES: (1) Return ONLY the SQL query — no explanation, no markdown, no backticks. "
        "(2) Never use DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, or PRAGMA. "
        "(3) Use strftime('%Y-%m-%d', column) for date formatting in SQLite. "
        "(4) Limit results to 100 rows by default unless the question asks for more. "
        "(5) Only use the tables listed in the schema. "
        f"\n\nSchema:\n{schema_info}"
    )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=system_prompt
        )
        response = model.generate_content(question)
        sql = response.text.strip()
        # Strip accidental markdown fences
        if sql.startswith('```'):
            sql = sql.split('```')[1]
            if sql.lower().startswith('sql'):
                sql = sql[3:]
            sql = sql.strip()
    except Exception as e:
        print(f'[Internal Error] {e}')
        return jsonify({'error': 'AI generation failed: An internal server error occurred'}), 500

    # Safety check — block any mutating keywords
    sql_upper = sql.upper()
    for banned in ['DROP ', 'DELETE ', 'UPDATE ', 'INSERT ', 'ALTER ', 'CREATE ', 'PRAGMA']:
        if banned in sql_upper:
            return jsonify({'error': 'AI tried to generate a mutating query. Blocked for safety.', 'sql': sql}), 400

    # Execute the query
    try:
        result = db.session.execute(text(sql))
        rows = result.fetchall()
        columns = list(result.keys())
        data_out = [dict(zip(columns, row)) for row in rows]
        return jsonify({
            'question': question,
            'sql':      sql,
            'columns':  columns,
            'results':  data_out,
            'rowCount': len(data_out),
        }), 200
    except Exception as e:
        print(f'[Internal Error] {e}')
        return jsonify({'error': 'SQL execution failed: An internal server error occurred', 'sql': sql}), 400
