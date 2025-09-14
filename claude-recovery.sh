#!/bin/bash

# Claude Shell Recovery Script

# 1. Check if Claude is running
check_claude() {
    if pgrep -f "claude" > /dev/null; then
        echo "✓ Claude process is running"
        ps aux | grep claude | grep -v grep
    else
        echo "✗ Claude process not found"
        echo "Restart with: claude"
    fi
}

# 2. Save work periodically
save_state() {
    echo "Saving current state..."
    git add -A
    git stash push -m "Auto-save $(date +%Y%m%d-%H%M%S)"
    echo "State saved to git stash"
}

# 3. Create session backup
backup_session() {
    backup_dir="$HOME/.claude-backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"

    # Save environment
    env > "$backup_dir/environment.txt"

    # Save working directory
    pwd > "$backup_dir/working_dir.txt"

    # Save git status
    git status > "$backup_dir/git_status.txt" 2>&1

    echo "Session backed up to: $backup_dir"
}

# Main menu
echo "Claude Shell Recovery Tools"
echo "1. Check Claude status"
echo "2. Save current work"
echo "3. Backup session"
echo "4. All of the above"

read -p "Select option (1-4): " choice

case $choice in
    1) check_claude ;;
    2) save_state ;;
    3) backup_session ;;
    4)
        check_claude
        save_state
        backup_session
        ;;
    *) echo "Invalid option" ;;
esac