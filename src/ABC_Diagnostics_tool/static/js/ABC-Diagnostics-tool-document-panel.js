// Functionality of the individual document view panels/cards


function getDocumentPanel(documentID) {
  return document.querySelector(`.document-panel[data-document-id="${documentID}"]`);
}

function createDocumentPanel(parentDocumentID) {
  // First create the respective new document entry
  const documentEntry = createDocument(parentDocumentID);

  const documentPanelID = `documentPanel${documentEntry.id}`;

  const documentPanelContents = `<div class="card">
    <div class="card-header">
      <div class="d-flex justify-content-between p-2">
        <div>
          <span>Document #${documentEntry.id}</span>
          ${(parentDocumentID != undefined) ? `<small class=\"text-body-secondary ms-2f\">Parent: #${parentDocumentID}</small>` : ""}
          <i id="warning_${documentEntry.id}"
              class="ms-2 bi-exclamation-triangle-fill d-none text-warning"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              data-bs-custom-class="tooltip-small"
              title="Parent document was reprocessed">
          </i>
        </div>
        ${(documentEntry.id != 0) ? `
          <button type="button" class="btn document-panel-hide-btn btn-danger btn-sm ms-2">
            <i class="bi bi-eye-slash"></i>
            Hide
          </button>` : ``}
      </div>
      
      <button type="button" class="btn document-panel-copy-btn btn-secondary btn-sm ms-2">
        <i class="bi bi-file-earmark-diff"></i> 
        New Version
      </button>
      <button type="button" class="btn document-panel-modifications-btn btn-secondary btn-sm ms-2" data-bs-toggle="modal" data-bs-target="#modificationsModal">
        <i class="bi bi-pencil-square"></i> 
        Modifications
      </button>
      <button type="button" class="btn document-panel-processing-btn btn-primary btn-sm ms-2">
        <i class="bi bi-magic"></i> 
        Process
      </button>
    </div>

    <div class="card-body">
        <div>
          <label for="${documentPanelID}-Input" class="form-label">Input text:</label>
          <textarea class="form-control" id="${documentPanelID}-Input" rows="10" aria-label="Input text for document ${documentEntry.id}"></textarea>
        </div>
    </div>

    <div class="card-footer">
    </div>
  
  </div>`;

  const documentPanel = document.createElement("div");
  documentPanel.id = documentPanelID;
  documentPanel.className = "col document-panel";
  documentPanel.dataset.documentId = documentEntry.id;

  documentPanel.innerHTML = documentPanelContents;
  documentPanel.querySelector("textarea").value = documentEntry.text;


  // Enable the event handlers
  documentPanel.querySelector("button.document-panel-copy-btn").addEventListener("click",() => {
    createDocumentPanel(documentEntry.id)
  });

  documentPanel.querySelector("textarea").addEventListener("input", 
     (event) => {updateDocumentText(documentEntry.id, event.target.value)}
  );

  documentPanel.querySelector("button.document-panel-processing-btn").addEventListener("click", async (event) => {
    //Do not allow to press any process button several times or simultaneously to avoid multiple requests while processing
    const processBtns = document.querySelectorAll(".document-panel-processing-btn");
    processBtns.forEach(button => button.disabled = true); //Disable all process buttons to avoid multiple clicks while processing
    
    try {
      await requestDocumentProcessing(documentEntry.id);
    } catch (err) {
      toggleNavbarLoadingSpinner(false);
      showErrorForModificationModal(`An error occurred while processing Document #${documentEntry.id}. Please try again.`, 6000);
      console.error(err);
    } finally {
      processBtns.forEach(button => button.disabled = false); //Re-enable buttons
    }
  });

  if (documentEntry.id != 0){ //Do not allow hiding the initial document
    documentPanel.querySelector("button.document-panel-hide-btn").addEventListener("click",
      () => {
        displayDocument(documentEntry.id, false);
        addToHiddenDocument(documentEntry.id);
        hideDocumentFromDownloadList(documentEntry.id);
      }
    );
  };

  document.querySelector("#mainRow").appendChild(documentPanel);
}


// Modifications modal event handler
function onModificationsModalShow(event) {
  modificationsModalReset();

  const modificationsModal = document.querySelector("#modificationsModal");

  let documentPanel = null;

  // Assuming that one of document panel buttons was clicked to open this modal, 
  // look up the respective document panel element
  if (event.relatedTarget) {
    documentPanel = event.relatedTarget.closest(".document-panel");
  }

  if (!documentPanel) {
    console.warn(new Date().toISOString(), "Document panel not found for the modifications modal");
    return;
  }

  const documentEntry = getDocument(+documentPanel.dataset.documentId);
  if (!documentEntry) {
    console.warn(new Date().toISOString(), `Document #${documentID} not found for the modifications modal`);
    return;
  }

  // Update the reference to the currently selected document entry
  modificationsModal.dataset.documentId = documentEntry.id;

  // Update the contents of the modal dialog
  modificationsModal.querySelector("#modificationsModalDocumentID").innerText = documentEntry.id;

  if (documentEntry.substitutions) {
    modificationsModal.querySelector("#modificationsModalTextareaFrom").value = documentEntry.substitutionsFrom;
    modificationsModal.querySelector("#modificationsModalTextareaTo").value = documentEntry.substitutionsTo;
  }
}

// Modifications modal event handler
function onModificationsModalConfirm(event) {
  const modificationsModal = document.querySelector("#modificationsModal");

  const documentEntry = getDocument(+modificationsModal.dataset.documentId);
  if (!documentEntry) {
    console.warn(new Date().toISOString(), `Document #${documentID} not found for the modifications modal confirmation`);

    bootstrap.Modal.getInstance(modificationsModal).hide();
    return;
  }

  documentEntry.substitutionsFrom = modificationsModal.querySelector("#modificationsModalTextareaFrom").value;
  documentEntry.substitutionsTo = modificationsModal.querySelector("#modificationsModalTextareaTo").value;

  documentEntry.substitutions = composeSubstitutionsToJSON(documentEntry.substitutionsFrom, documentEntry.substitutionsTo);

  bootstrap.Modal.getInstance(modificationsModal).hide();

  // Trigger the update
  confirmDocumentModifications(documentEntry.id);
}

//Create a JSON from two separate inputs
function composeSubstitutionsToJSON(from, to) {
  const fromList = from.split('\n').map(s => s.trim()).filter(Boolean);
  const toList = to.split('\n').map(s => s.trim()).filter(Boolean);
  if (fromList.length === 0 || toList.length === 0 || fromList.length !== toList.length) {
    showErrorForModificationModal("Warning: both lists must contain values and be the same length.", 7000);
    return null;
  }
  const substitutions = {};

  fromList.forEach((key, index) => {
    const value = toList[index];
    if (value !== undefined) {
      substitutions[key] = value;
    }
  });

  return JSON.stringify(substitutions);
}


// Modifications modal event handler
function onModificationsModalHidden(event) {
  modificationsModalReset();
}

// Cleans up the contents of the modifications dialog
function modificationsModalReset() {
  const modificationsModal = document.querySelector("#modificationsModal");

  modificationsModal.dataset.documentId = "";
  modificationsModal.querySelector("#modificationsModalDocumentID").innerText = "";

  modificationsModal.querySelector("#modificationsModalTextareaFrom").value = ``;
  modificationsModal.querySelector("#modificationsModalTextareaTo").value = ``;
}


// Applies the confirmed modifications and updates the respective document panel
function confirmDocumentModifications(documentID) {
  const documentEntry = getDocument(documentID);
  if (!documentEntry) {
    console.warn(new Date().toISOString(), `Document #${documentID} not found for document text modifications`);
    return;
  }

  const documentPanel = getDocumentPanel(documentID);
  if (!documentPanel) {
    console.warn(new Date().toISOString(), `Document panel #${documentID} not found for document text modifications`);
    return;
  }

  // Update the data entry
  applyDocumentTextSubstitutions(documentID);

  // Update the UI
  documentPanel.querySelector("textarea").value = documentEntry.text;
}

// Error message in popup when modification sizes are invalid
function showErrorForModificationModal(message, timeout = 3000) {
    const alert = document.getElementById('overlayAlert');
    alert.textContent = message;
    alert.classList.remove('d-none');

    setTimeout(() => {
        alert.classList.add('d-none');
    }, timeout);
}

// Requests the document processing by the backend
async function requestDocumentProcessing(documentID) {
  const documentEntry = getDocument(documentID);
  if (!documentEntry) {
    console.warn(new Date().toISOString(), `Document #${documentID} not found for document processing`);
    return;
  }

  if (!documentEntry.text) {
    console.warn(new Date().toISOString(), `Document #${documentID} text is empty, aborting document processing`);
    return;
  }

  const documentPanel = getDocumentPanel(documentID);
  if (!documentPanel) {
    console.warn(new Date().toISOString(), `Document panel #${documentID} not found for document processing`);
    return;
  }

  toggleNavbarLoadingSpinner(true);
  removeParentReprocessWarning(documentEntry);

  const documentProcessingResults = await sendDocumentProcessingRequest(documentEntry);
  console.log("Document processing results:", documentProcessingResults);
  const footerContent = document.createElement("div");

  // Update the document panel footer
  footerContent.innerHTML = `<div>Text classification result: <b>${documentProcessingResults.classes}</b> </div>`;

  //Add D3 grid to footer
  const D3Comparison = document.createElement("div");
  D3Comparison.innerHTML = `
        <div class="flex-fill compare-grid-container py-2" id="compareGridContainer${documentEntry.id}">
          <!-- D3 will append svgs here -->
        </div>`;
  footerContent.appendChild(D3Comparison);

  const footer = documentPanel.querySelector(".card-footer");
  footer.innerHTML = "";
  footer.appendChild(footerContent);

  
  // If document has a parent we add a listener for changes 
  if(documentEntry.parentDocumentID != null){
    listenToParentProcessButton(documentEntry);
  }

  //Get and set the alignment option from settings 
  let alignmentSetting = document.querySelector('input[name="radioDefault"]:checked').id;
  visualizeDocuments(documentEntry.id, documentEntry.parentDocumentID, alignmentSetting)

  // Makes new document downloadable 
  addDocumentToDownloadList(documentID);

  //Show the colorbar when document is processed
  document.getElementById("colorRangeContainer").classList.remove("d-none");

  toggleNavbarLoadingSpinner(false);
}

//Adds warning icon to document if parent "Process" button is pressed
function listenToParentProcessButton(documentEntry){
  const parentDocumentPanel = document.querySelector(`#documentPanel${documentEntry.parentDocumentID}`);
  const parentProcessButton = parentDocumentPanel.querySelector(".document-panel-processing-btn");
  //Add eventlistener if parents "Process" button is pressed
  parentProcessButton.addEventListener("click", () => {
    //Add warning to notice that parent has changed with a tooltip on hover
    document.querySelector(`#warning_${documentEntry.id}`).classList.remove("d-none");
    const warningIcon = document.querySelector(`#warning_${documentEntry.id}`);
    if (warningIcon) new bootstrap.Tooltip(warningIcon);
  });
}

//Hides the warning icon that the parent has been processed
function removeParentReprocessWarning(documentEntry){
  document.querySelector(`#warning_${documentEntry.id}`).classList.add("d-none");
}

// Function to hide documents 
function displayDocument(documentID, visible) {
  const documentPanel = getDocumentPanel(documentID);
  if(visible) {
    documentPanel.style.display = '';
  }else{
    documentPanel.style.display = 'none';
  }
}

//Color the words with corresponding weight
function createColoredSentence(word_weights, mismatchFlags) {
  const container = document.createElement("div");
  container.classList.add("text-span-container");

  word_weights.forEach(([word, weight], i) => {
    // Remove CLS, SEP or null tokens
    if (word === "[CLS]" || word === "[SEP]" || word === null) return;

    const span = createWordSpan(word, weight);

    if (mismatchFlags?.[i]) { //Mark the words that does not align
      span.style.textDecoration = "underline";
      span.style.textDecorationColor = "#c10000";
      span.style.textDecorationThickness = "3px";
    }

    container.appendChild(span);
  });
  return container;
}

// Creates a span with a word and weight and color it correspondingly
function createWordSpan(word, weight) {
  const span = document.createElement("span");

  const colorScale = d3.scaleLinear()
    .domain([-1, 0, 1])
    .range([
      "rgb(255,140,0)", // negative
      "white",          // zero
      "rgb(0,0,255)"    // positive
    ]);
  span.style.background = colorScale(weight)

  if (['.', ',', '!', '?', ';', ':'].includes(word)) {
    span.classList.add("special-char-class");
  }
  else if (/#/.test(word)) {
    word = word.replace(/#/g, "");
    span.classList.add("separated-word");
  }
  else {
    span.classList.add("word-class");
  }

  span.textContent = word;
  return span;
}