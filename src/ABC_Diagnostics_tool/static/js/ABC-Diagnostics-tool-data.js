// Data model and external API connectors

const DOCUMENTS = [];
var DOCUMENT_COUNTER = 0;

// Helper function for looking up a document entry based on its ID
function getDocument(documentID) {
  return DOCUMENTS.find((d) => d.id === documentID);
}


// Create and store a new document entry, possibly initialized with the parent document text
function createDocument(parentDocumentID) {
  const documentID = DOCUMENT_COUNTER++;

  let documentEntry = {
    id: documentID,
    parentDocumentID: null,
    text: ""
  };

  const parentDocument = getDocument(parentDocumentID);
  if (parentDocument) {
    documentEntry.parentDocumentID = parentDocumentID;
    documentEntry.text = parentDocument.text;
  }


  DOCUMENTS.push(documentEntry);

  return documentEntry;
}


// Update the document entry text
function updateDocumentText(documentID, text) {
  const documentEntry = getDocument(documentID);

  if (!documentEntry) {
    console.warn(new Date().toISOString(), `Document #${documentID} not found for document text updates`);
    return;
  } 

  documentEntry.text = text;
}


// Apply substitutions for the document entry text
function applyDocumentTextSubstitutions(documentID) {
  const documentEntry = getDocument(documentID);

  if (!documentEntry) {
    console.warn(new Date().toISOString(), `Document #${documentID} not found for document text substitutions`);
    return;
  } 

  const substitutions = JSON.parse(documentEntry.substitutions);
  if (!substitutions) {
    console.warn(new Date().toISOString(), `Document #${documentID} has no proper substitutions available`);
    return;
  }

  let modifiedText = documentEntry.text;

  for (const [k, v] of Object.entries(substitutions)) {
    const re = new RegExp(k, "gi");
    modifiedText = modifiedText.replaceAll(re, v);
  }

  documentEntry.text = modifiedText;
}

// Issue a request for the backend document processing
async function sendDocumentProcessingRequest(documentEntry){
	console.debug(new Date().toISOString(), "Document processing request - sending");

  try {
    const parentDocumentEntry = getDocument(documentEntry.parentDocumentID);
    const parentDocumentProcessingResults = parentDocumentEntry ? parentDocumentEntry.processingResults : null;
    const dataResponse = await fetch('./process_document', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: documentEntry.text,
            parent_tokens: parentDocumentProcessingResults ? parentDocumentProcessingResults.tokens : "" // Pass the parents tokens if it has a parent document 
        })
    });
    
    console.debug(new Date().toISOString(), "Document processing request - complete");

    const jsonData = await dataResponse.json();

    console.debug(new Date().toISOString(), "Document processing request - incoming JSON data ready");

    // Update the document entry
    documentEntry.processingResults = jsonData.result;

    return jsonData.result;

  } catch (error) {
    console.error(new Date().toISOString(), "Document processing request error: ", error);
  }
}
