#!/bin/sh
PYTHONPATH=src:$PYTHONPATH PYTHONDONTWRITEBYTECODE=1 flask --app bert_model_dev.ABC_bert_model_api_dev --debug run --port 5101
