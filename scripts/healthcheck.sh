#!/usr/bin/env bash
# FoxOnAShelf™ - healthcheck.sh (wrapper bash del script Node)
set -e
node "$(dirname "$0")/healthcheck.js"
