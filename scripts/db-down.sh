#!/usr/bin/env bash
set -euo pipefail

container_name="tictaak-db"

# Stop the DB container if it exists.
docker stop "$container_name" >/dev/null 2>&1 || true
