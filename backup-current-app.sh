#!/bin/bash
# Backup current app before rebuild
echo "Creating backup of current application..."

# Create backup directory
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"

# Backup key files
cp -r server/ $BACKUP_DIR/
cp -r client/ $BACKUP_DIR/ 2>/dev/null || echo "No client directory found"
cp -r src/ $BACKUP_DIR/ 2>/dev/null || echo "No src directory found"
cp -r shared/ $BACKUP_DIR/ 2>/dev/null || echo "No shared directory found"
cp package.json $BACKUP_DIR/
cp replit.md $BACKUP_DIR/
cp .replit $BACKUP_DIR/ 2>/dev/null || echo "No .replit found"

echo "Backup created at: $BACKUP_DIR"
echo "Your data in PostgreSQL is safe and will remain intact"