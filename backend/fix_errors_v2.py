import os

directory = r"c:/Users/Pratham Kumar/OneDrive/Desktop/Colleg-event-hub/college-event-hub/backend/routes"
changed = 0

for filename in os.listdir(directory):
    if filename.endswith(".py"):
        filepath = os.path.join(directory, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        orig = content
        
        # Safe string replacements
        content = content.replace("str(e)", '"An internal server error occurred"')
                
        if orig != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            changed += 1
            print(f"Patched {filename}")

print(f"Total patched files: {changed}")
