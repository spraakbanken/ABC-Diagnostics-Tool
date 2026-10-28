#!/bin/sh
PYTHONPATH=src:$PYTHONPATH PYTHONDONTWRITEBYTECODE=1 flask --app ABC_Diagnostics_tool.ABC_Diagnostics_tool_web_server run --port 5100