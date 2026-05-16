import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:postgres123@localhost/college_event_hub")
    cur = conn.cursor()
    cur.execute("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) UNIQUE;")
    conn.commit()
    print("Column firebase_uid added successfully")
except psycopg2.errors.DuplicateColumn:
    print("Column firebase_uid already exists")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
