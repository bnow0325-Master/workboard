#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:?usage: server-deploy.sh SOURCE_DIR RELEASE_ID}"
RELEASE_ID="${2:?usage: server-deploy.sh SOURCE_DIR RELEASE_ID}"
RELEASE_DIR="/srv/workboard/releases/${RELEASE_ID}"

test -f "${SOURCE_DIR}/index.html"
test -f "${SOURCE_DIR}/government/index.html"
test ! -e "${RELEASE_DIR}"

mkdir -p "${RELEASE_DIR}"
cp -a "${SOURCE_DIR}/index.html" "${RELEASE_DIR}/index.html"
cp -a "${SOURCE_DIR}/government" "${RELEASE_DIR}/government"
chown -R root:root "${RELEASE_DIR}"
find "${RELEASE_DIR}" -type d -exec chmod 755 {} +
find "${RELEASE_DIR}" -type f -exec chmod 644 {} +
ln -sfn "${RELEASE_DIR}" /srv/workboard/current

nginx -t
systemctl reload nginx
