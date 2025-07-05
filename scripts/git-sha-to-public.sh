# scripts/write-git-sha.sh
#!/usr/bin/env bash
echo "{\"sha\":\"$(git rev-parse --short HEAD)\"}" > public/version.json
