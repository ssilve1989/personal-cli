#!/bin/sh
set -e
bun install && bun run build && ln -sf "$(pwd)/dist/scli" ~/.local/bin/scli
echo "Installed scli to ~/.local/bin/scli"
