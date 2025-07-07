#!/bin/bash
cd /home/kavia/workspace/code-generation/wordquest-web-121029-b6620b23/wordsearch_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

