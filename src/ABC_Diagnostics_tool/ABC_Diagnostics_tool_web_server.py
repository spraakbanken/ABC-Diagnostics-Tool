"""
The visualization web server implemented as a Flask app
"""

import logging
FORMAT = '%(asctime)s %(message)s'
logging.basicConfig(format=FORMAT)

import traceback
import json
import requests

from sequence_align.pairwise import alignment_score, needleman_wunsch

from flask import Flask
from flask import request


BERT_MODEL_API_CLASSIFICATION_ENDPOINT = 'http://localhost:5101/get_text_classification_results'

# See the notes below for the deployed version
app = Flask(__name__, static_url_path='')
# For the deployed version, disable serving static files
# Instead, start the application only:
#app = Flask(__name__, static_folder=None)


logging.info("Web server - started")

@app.route('/')
def root():
    return app.send_static_file('index.html')


@app.route('/process_document', methods=['POST'])
def process_document():
    try:
        data = request.get_json()
        request_document_text = data.get('text', '')
        parent_tokens = data.get('parent_tokens', '')
        
        logging.debug("Request for document processing - started")

        payload = {'texts': [request_document_text]}
        
        response = requests.post(
            BERT_MODEL_API_CLASSIFICATION_ENDPOINT,
            json=payload
        )
        response.raise_for_status()
        classification_results = response.json()

        classification_tokens = classification_results['result']['tokens']

        if parent_tokens == "" or len(parent_tokens) == 0:
            logging.info("No parent tokens provided, skipping alignment.")
        else:
            aligned_results_tokens, aligned_parent_tokens = needleman_wunsch(
                classification_tokens,
                parent_tokens,
                match_score=1.0,
                mismatch_score=-1.0,
                indel_score=-1.0,
                gap=None,
            )
            score = alignment_score(
                aligned_results_tokens,
                aligned_parent_tokens,
                match_score=1.0,
                mismatch_score=-1.0,
                indel_score=-1.0,
                gap=None,
            )
            normalized_score = (score-2)/(len(aligned_results_tokens)-2)

            # Update the tokens with the aligned sequences (Its own tokens and the parent's tokens) 
            classification_results["result"]["aligned_results"] = [aligned_results_tokens, aligned_parent_tokens]

            classification_results["result"]["alignment_score"] = normalized_score
        
        result = json.dumps(classification_results)

        logging.info("Request for document processing - completed")
        return result
    
    except Exception as e:
        logging.error(traceback.format_exc())
        return json.dumps({'error': repr(e)})

