import os

directory = r"c:/Users/Pratham Kumar/OneDrive/Desktop/Colleg-event-hub/college-event-hub/backend/routes"
changed = 0

for filename in os.listdir(directory):
    if filename.endswith(".py"):
        filepath = os.path.join(directory, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        modified = False
        for i, line in enumerate(lines):
            if "str(e)" in line and ("jsonify" in line or '"error"' in line):
                # Add print statement before return
                indentation = line[:len(line) - len(line.lstrip())]
                print_stmt = f"{indentation}print(f'[Internal Error] {{e}}')\n"
                
                # Sanitize the current line
                sanitized_line = line.replace("str(e)", '"An internal server error occurred"')
                
                lines[i] = print_stmt + sanitized_line
                modified = True
                
        if modified:
            with open(filepath, "w", encoding="utf-8") as f:
                f.writelines(lines)
            changed += 1
            print(f"Patched {filename}")

print(f"Total patched files: {changed}")
