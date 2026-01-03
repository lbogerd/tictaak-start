#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

image_name="tictaak-db"
container_name="tictaak-db"
volume_name="tictaak-db-data"

# Build/update the local Postgres image (includes init SQL from drizzle/*.sql)
docker build -f Dockerfile.db -t "$image_name" .

# If the container already exists, just start it. Otherwise, create it.
if docker ps -a --format '{{.Names}}' | grep -qx "$container_name"; then
	docker start "$container_name" >/dev/null
else
	docker run -d --name "$container_name" \
		-e POSTGRES_DB=tictaak \
		-e POSTGRES_USER=tictaak \
		-e POSTGRES_PASSWORD=tictaak \
		-p 5432:5432 \
		-v "$volume_name":/var/lib/postgresql/data \
		"$image_name" >/dev/null
fi

echo "DB is running: postgresql://tictaak:tictaak@localhost:5432/tictaak"
