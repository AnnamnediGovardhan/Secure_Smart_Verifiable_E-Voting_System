#!/usr/bin/env bash
# SSVEVS+ single-terminal launcher (macOS / Linux).
#   ./run.sh            boot everything
#   ./run.sh --setup    install deps first, then boot
cd "$(dirname "$0")"
exec python3 run.py "$@"
