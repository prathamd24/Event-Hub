import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    # Connect to the default postgres database to create a new one
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="postgres123",  # Assuming default based on typical setups, the app config.py will show if it's different
        host="localhost",
        port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'college_event_hub'")
    exists = cursor.fetchone()
    
    if exists:
        cursor.execute("DROP DATABASE college_event_hub")
        print("Dropped existing database 'college_event_hub'")
        
    cursor.execute("CREATE DATABASE college_event_hub")
    print("Successfully created fresh database 'college_event_hub'")
        
    cursor.close()
    conn.close()

except psycopg2.Error as e:
    print(f"Error connecting to PostgreSQL: {e}")
    # Print a helpful hint for the user
    print("\nIf you see an authentication failure, update the 'password' in this script to match your postgres password.")
