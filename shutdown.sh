#!/bin/bash
# .env 파일에서 PROCESS_NAME 변수 추출 및 공백 제거
PROCESS_NAME=$(grep PROCESS_NAME ./.env | cut -d '=' -f2 | tr -d '[:space:]')
echo "Killing $PROCESS_NAME"
pkill -f "$PROCESS_NAME"