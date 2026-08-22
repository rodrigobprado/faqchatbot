#!/bin/bash
set -euo pipefail

BRANCH="${1:?branch is required}"
SOURCE_DIR="${2:?source dir is required}"
RELEASE_NUMBER="${3:?release number is required}"

BASE_DIR="/wwwroot/sites/faqchatbot"
BRANCH_DIR="${BASE_DIR}/${BRANCH}"
RELEASE_DIR="${BRANCH_DIR}/releases/${RELEASE_NUMBER}"
SHARED_DIR="${BRANCH_DIR}/shared"

mkdir -p "${BRANCH_DIR}/releases" "${SHARED_DIR}/log"

if [ ! -f "${SHARED_DIR}/.env" ]; then
  cp "${SOURCE_DIR}/.env.example" "${SHARED_DIR}/.env"
fi

rm -Rf "${RELEASE_DIR}"
cp -a "${SOURCE_DIR}/." "${RELEASE_DIR}/"

ln -sfn "${SHARED_DIR}/.env" "${RELEASE_DIR}/.env"
ln -sfn "${SHARED_DIR}/log" "${RELEASE_DIR}/log"
ln -sfn "${RELEASE_DIR}" "${BRANCH_DIR}/current"

sudo chown -R www-data:www-data "${BRANCH_DIR}"
