#!/usr/bin/env bash
set -euo pipefail

jwt_secret=$(openssl rand -hex 32)
session_secret=$(openssl rand -hex 32)

echo "JWT_SECRET=${jwt_secret}"
echo "SESSION_SECRET=${session_secret}"
