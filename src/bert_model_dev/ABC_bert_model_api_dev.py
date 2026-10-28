"""
Mock model API based on a BERT classification model to be used for internal development purposes
"""

import logging
FORMAT = '%(asctime)s %(message)s'
logging.basicConfig(format=FORMAT)
logging.getLogger().setLevel('INFO')

import traceback
import json
import html

from flask import Flask, request, jsonify

import torch
from transformers import AutoModelForSequenceClassification,AutoTokenizer
from transformers_interpret import SequenceClassificationExplainer, MultiLabelClassificationExplainer


BERT_MODEL_ID = 'rimusa/CEFR_essay_classification-swedish-cased'

# Note that in the future, a different BERT model may be tested
tokenizer = AutoTokenizer.from_pretrained(BERT_MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(BERT_MODEL_ID, attn_implementation='eager')
class_mapping = ['A1', 'A2', 'B1', 'B2', 'C1']

logging.info("Mock BERT model API - model loaded")

app = Flask(__name__, static_folder=None)

logging.info("Mock BERT model API - web server started")


"""
Expected request structure: 
{
  texts: [
    "text 1",
    "text 2"
  ]
}
"""

@app.post("/get_text_classification_results")
def get_text_classification_results():
  request_data = request.get_json(force=True, silent=True, cache=False)

  if not request_data or len(request_data.get('texts')) == 0:
    return {'result': False}
  
  input_text = request_data.get('texts')
  
  inputs = tokenizer(input_text, return_tensors="pt", padding = True)
  tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])

  with torch.no_grad():
        outputs = model(**inputs, output_attentions=True) 

  classes = outputs.logits.argmax(1).tolist()
  labels = [model.config.id2label[x] for x in classes]

  #Convert the labels to the corresponding A1-C2 scale
  classes = [class_mapping[i] for i in classes]

  cls_explainer = MultiLabelClassificationExplainer(model, tokenizer)
  word_weights = []
  for text in input_text: 
     word_weights.append(cls_explainer(text))
  
  return {'result': {
     'classes': classes,
     'labels': labels,
     'word_weights' : word_weights,
     'tokens': tokens
  }}