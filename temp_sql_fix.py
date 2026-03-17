from sqlalchemy import create_engine, text
from datetime import date
import sys

db_url = 'postgresql://postgres:postgres123@localhost/college_event_hub'
engine = create_engine(db_url)

try:
    with engine.begin() as conn:
        today = date.today()
        print(f"Running direct SQL fixes for {today}...")
        
        # 1. Fix ONGOING events that are actually in the future:
        res1 = conn.execute(
            text("UPDATE events SET status = 'UPCOMING' WHERE event_date > :today AND status = 'ONGOING'"),
            {'today': today}
        )
        print(f"Fixed {res1.rowcount} future events that were marked ONGOING.")
        
        # 2. Fix NULL event_scope:
        res2 = conn.execute(
            text("UPDATE events SET event_scope = 'INTRA' WHERE event_scope IS NULL")
        )
        print(f"Fixed {res2.rowcount} events with NULL event_scope.")
        
        print("Database cleanup complete.")

except Exception as e:
    print(f"DB ERROR: {e}")
    sys.exit(1)
