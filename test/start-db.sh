#!/bin/bash

# get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "[start-db] Script directory: $SCRIPT_DIR"

# check if database is available
npx prisma dev ls | grep test-db

# if the output contains "test-db", remove it
if [ $? -eq 0 ]; then
	echo "[start-db] Removing existing test-db..."
	# run delete-db.sh in this script's directory
	bash "$SCRIPT_DIR/delete-db.sh"
fi

# start the database in background and capture output
echo "[start-db] Starting test-db..."
nohup npx prisma dev --name test-db > /tmp/prisma_output.log 2>&1 &
PRISMA_PID=$!

# disown the process to detach it from the shell
disown $PRISMA_PID

# wait for the server to start up
sleep 5

# extract the database url from the output
DATABASE_URL=$(grep -m 1 'DATABASE_URL=' /tmp/prisma_output.log | sed -n 's/.*DATABASE_URL="\([^"]*\)".*/\1/p' | head -1)

# if extraction failed, try alternative pattern without quotes
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(grep -m 1 'DATABASE_URL=' /tmp/prisma_output.log | cut -d'=' -f2- | head -1)
fi

# echo the database url
echo "[start-db] Extracted DATABASE_URL:"
echo "[start-db] $DATABASE_URL"

ENV_FILE="$SCRIPT_DIR/../.env"

# Ensure .env file exists
touch "$ENV_FILE"

# Check if DATABASE_URL exists in the file
if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
    # Get the current value
    CURRENT_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)
    if [ "$CURRENT_URL" != "$DATABASE_URL" ]; then
        # Comment out the current line
        sed -i.bak '/^DATABASE_URL=/ s/^/# /' "$ENV_FILE"
        # Add the new DATABASE_URL at the end
        echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"
    fi
else
    # Add DATABASE_URL if it does not exist
    echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"
fi


echo "[start-db] Database process started with PID: $PRISMA_PID"
echo "[start-db] Process has been detached and will continue running after script exits"

# clean up temp file
rm -f /tmp/prisma_output.log