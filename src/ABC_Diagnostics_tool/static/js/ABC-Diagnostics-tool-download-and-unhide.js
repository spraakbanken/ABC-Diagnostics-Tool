let hasDownloadEntries = false;
let documentList = [];
let hiddenDocuments = [];

// Add processed document to the download list (or update the current document)
function addDocumentToDownloadList(id) {
    const documentListContainer = document.getElementById("documentList");
    const currentDoc = getDocument(id);
    const listId = `doc-${id}`;
    const shortText = currentDoc.text.length > 50 ? currentDoc.text.substring(0, 90) + "..." : currentDoc.text;

    // Activate download button when first document has been processed
    if(!hasDownloadEntries){
        hasDownloadEntries = true;
        documentListContainer.innerHTML = ``;
        initDownloadButton();
    }
    //Check if document has been added, otherwise make a new entry
    if(documentList.includes(id)){
        document.getElementById(listId).querySelector("small").textContent = shortText;
    }
    else{
        documentList.push(id); 
        const documentListEntry = `
        <li class="list-group-item d-flex align-items-start" id="${listId}">
            <input class="form-check-input me-2" type="checkbox" value="${id}">
            <div>
                <div class="fw-bold">Document #${id}</div>
                <small class="text-body-tertiary">${shortText}</small>
            </div>
        </li>`;
        documentListContainer.innerHTML += documentListEntry;
    }
}

function initDownloadButton() {
    const downloadBtn = document.getElementById("downloadSelectedBtn");
    downloadBtn.disabled = false;

    downloadBtn.addEventListener("click", () =>{
        //Select all checked documents
        const checkedBoxes = document.querySelectorAll("#documentList input[type='checkbox']:checked");
        const selectedDocuments = Array.from(checkedBoxes).map(box => Number(box.value));
        if(selectedDocuments.length < 1) return; //Dont download an empty json
        const weightsArray = {};
        //Get all selected documents and add to weightsArray
        selectedDocuments.forEach((id) =>{
            weightsArray[`doc_${id}`] = getDocument(id).processingResults.word_weights[0];
        });

        // Make a json-file to download
        const jsonString = JSON.stringify(weightsArray, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "document_weights.json";
        link.click();

        URL.revokeObjectURL(link.href);
    })
}

//Remove document by id from download list, if it has downloadable content
function hideDocumentFromDownloadList(id) {
    if(documentList.includes(id)){
        document.getElementById(`doc-${id}`).classList.add('d-none');
        documentList = documentList.filter(n => n !== id);
        //Uncheck box so it is not downloaded when hidden
        const downloadCheckbox = document.querySelector(`#doc-${id} input[type='checkbox']`);
        if (downloadCheckbox) downloadCheckbox.checked = false;
    }
    hiddenDocuments.push(id);
}

//If document has downloadable content, re-add it. Otherwise just remove it from hiddenDocuments
function unhideDocumentFromDownloadList(id) {
    const doc = document.getElementById(`doc-${id}`);
    if(doc !== null){
        doc.classList.remove('d-none');
        documentList.push(id);
    }
    hiddenDocuments = hiddenDocuments.filter(n => n !== id);
}

//Adds document with id to hidden documents
function addToHiddenDocument(id) {
    const hiddenDocumentListContainer = document.getElementById("hiddenDocumentList");
    //Empty container and activate unhide all when first document is added
    if(hiddenDocuments.length === 0){
        hiddenDocumentListContainer.innerHTML = ``;
        const unhideAllBtn = document.getElementById("unhideAllButton");
        unhideAllBtn.disabled = false;
    }
    //Add hidden document to hidden list
    const listId = `hide-doc-${id}`;
    const currentDoc = getDocument(id);
    const shortText = currentDoc.text.length > 50 ? currentDoc.text.substring(0, 90) + "..." : currentDoc.text;
    const documentListEntry = document.createElement("li");
    documentListEntry.className = "list-group-item d-flex align-items-start align-items-center";
    documentListEntry.id = listId;
    documentListEntry.innerHTML = `
        <button type="button" class="btn btn-outline-secondary fw-semibold me-3">Unhide</button>
        <div>
            <div class="fw-bold">Document #${id}</div>
            <small class="text-body-tertiary">${shortText}</small>
        </div>`;
    hiddenDocumentListContainer.appendChild(documentListEntry);

    //Add unhide button for each document
    const docButton = document.getElementById(listId).querySelector('button');
    docButton.addEventListener("click", () => {
        unhideDocumentWithId(id)
    })
}

function initUnhideAllHiddenDocsBtn() {
    const unhideAllBtn = document.getElementById("unhideAllButton");
    unhideAllBtn.addEventListener("click", () => {
        //Go through the array and unhide all documents with their corrosponding id
        hiddenDocuments.forEach((id) => {
            unhideDocumentWithId(id)
        })
    })
}

//Re-adds the document to download list, document view and also removes it from hidden documents list
function unhideDocumentWithId(id) {
    unhideDocumentFromDownloadList(id)
    displayDocument(id, true)
    document.getElementById(`hide-doc-${id}`).remove()
    //Adds placeholder and deactivates unhide all document buttons, when hidden document list is empty 
    if(hiddenDocuments.length === 0){
        const hiddenDocumentListContainer = document.getElementById("hiddenDocumentList");
        hiddenDocumentListContainer.innerHTML = `
            <li class="list-group-item d-flex justify-content-center">
                There are no documents hidden.
            </li>`;
        const unhideAllBtn = document.getElementById("unhideAllButton");
        unhideAllBtn.disabled = true;
    }
}