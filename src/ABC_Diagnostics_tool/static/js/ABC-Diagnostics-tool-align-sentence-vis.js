//This function could be removed later when proper labels are provided by the api model
function getGradeFromLabel(label){
  if(label.startsWith("LABEL")){
    const grades = ['A1', 'A2', 'B1', 'B2', 'C1']
    const index = Number(label.replace('LABEL_', ''));
    return grades[index];
  }else{
    return label;
  }
}

//Global zoom state for all rows for a given document
const documentZoomStates = {};

//Create rows for weights per word
function visualizeDocuments(documentID, parentID, align) {
  const childDoc = getDocument(documentID).processingResults;
  const parentDoc = getDocument(parentID) ?.processingResults;
  //Initialize zoom state for this document if it doesn't exist
  if (!documentZoomStates[documentID]) {
    documentZoomStates[documentID] = {
      currentTransform: d3.zoomIdentity,
      zooms: [],
      observers: []
    };
  }

  //Clear all previous zooms and remove all ResizeObserver from before
  documentZoomStates[documentID].currentTransform = d3.zoomIdentity;
  documentZoomStates[documentID].zooms = [];
  documentZoomStates[documentID].observers.forEach(n => n.disconnect());
  documentZoomStates[documentID].observers = [];

  //Clear out container for the grid
  const compareGridContainer = document.getElementById(`compareGridContainer${documentID}`);
  compareGridContainer.innerHTML = "";

  const alignedWeightsByLabel = {};
  let mismatchFlags = null;
  let childAlignedSentence = null;
  let parentAlignedSentence = null;
  //Check if document has a parent
  if (parentDoc != null && childDoc.aligned_results) {
    //Align child and parent, alignSentencesAndTokens fixes words that has been align incorrectly or skip
    if(align === "realignAll"){
      let mismatch = null;
      [childAlignedSentence, parentAlignedSentence, mismatch] = alignSentencesAndTokens(childDoc.aligned_results[0], childDoc.aligned_results[1]);
      mismatchFlags = mismatch.slice(1, -1);
    }else{
      childAlignedSentence = childDoc.aligned_results[0];
      parentAlignedSentence = childDoc.aligned_results[1];
      mismatchFlags = getMisalignedFlags(childAlignedSentence, parentAlignedSentence);
    }

    //Align parent document to its corresponding weights
    const parentWordWeights = parentDoc.word_weights[0][parentDoc.labels[0]];
    const parentAlign = alignTokensToWeight(parentAlignedSentence, parentWordWeights);
    
    //Add visualization for parent
    visualizeAlignmentSingle(parentAlign, `P (${parentDoc.classes[0]})`, documentID,`Feature attributions for parent document ${parentID} with grade ${parentDoc.classes[0]}`, mismatchFlags);

    //For each grade (LABEL_0 to LABEL_4), we align the weights of the child to the sentence, which has also been aligned to the parent
    for (const label in childDoc.word_weights[0]) {
      const labelWeights = childDoc.word_weights[0][label];

      alignedWeightsByLabel[label] =
        alignTokensToWeight(childAlignedSentence, labelWeights);
    }
  }

  const labels = parentDoc != null && childDoc.aligned_results ? alignedWeightsByLabel : childDoc.word_weights[0];
  //Add a D3 sentence for each label (for the child document)
  let childWordWeights = null;
  for (const label in labels) {
    //remove CLS and SEP if they still is in the document
    childWordWeights = labels[label].filter(([token]) =>
      token !== '[CLS]' && token !== '[SEP]'
    );
    //Get grade and add "*" if it is the classified grade
    let displayLabel = getGradeFromLabel(label);
    let notation;
    let isPredictedClass;
    if(childDoc.labels[0] === label) {
      displayLabel+="*";
      notation = `Feature attributions for document ${documentID} for the predicted outcome`;
      isPredictedClass = true;
    } else{
      notation = `Feature attributions for document ${documentID} for an alternative outcome`;
      isPredictedClass = false;
    }
    visualizeAlignmentSingle(childWordWeights, displayLabel, documentID, notation, mismatchFlags, isPredictedClass);
  }
}

//Aligns two token-arrays by finding matching words and filling gaps with null.
function alignSentencesAndTokens(arr1, arr2) {
  const output1 = [];
  const output2 = [];
  const mismatchFlags = [];
  const lookaheadContainer  = document.getElementById("lookaheadInputSetting");
  let lookahead = Number(lookaheadContainer.value);
  let lookaheadMax = Number(lookaheadContainer.max);
  let lookaheadMin = Number(lookaheadContainer.min);
  //Limits the lookahead to values between 0 and 20, and update settings too
  if(lookahead > lookaheadMax){
    lookahead = lookaheadMax;
    lookaheadContainer.value = lookaheadMax;
  }else if(lookahead <= lookaheadMin){
    lookahead = 2*arr1.length; //0 means that we want to look through the whole sequence
    lookaheadContainer.value = lookaheadMin;
  }
  let i = 0;  // pointer for arr1
  let j = 0;  // pointer for arr2

  while (i < arr1.length) {
    const token1 = arr1[i];
    const token2 = arr2[j];

    //Skip if both tokens are null
    if (token1 === null && token2 === null) {
      i++;
      j++;
      continue;
    }

    //If either token is null we move on, we dont want to compare a word to null
    if (token1 === null || token2 === null) {
      output1.push(token1);
      output2.push(token2);
      mismatchFlags.push(token1 !== token2);
      i++;
      j++;
    }
    //keep tokens aligned if they align
    else if (token1 === token2) {
      output1.push(token1);
      output2.push(token2);
      mismatchFlags.push(false);
      i++;
      j++;
    }
    //Find next match when tokens dont align
    else {
      //Find the next matching pair of non-null tokens
      let matchI = -1;
      let matchJ = -1;
      for (let n = i; n < Math.min(arr1.length, i + lookahead + 1); n++) {
        if (arr1[n] === null) continue; // Dont compare with null
        for (let m = j; m < Math.min(arr2.length, j + lookahead + 1); m++) {
          if (arr2[m] === null) continue; // Dont compare with null
          if (arr1[n] === arr2[m]) { // Does the words align
            matchI = n;
            matchJ = m;
            break; // Break if we find the next match
          }
        }
        if (matchI !== -1) break;
      }

      // Check if match was found
      if (matchI !== -1 && matchJ !== -1) {
        // Add all tokens before the match from arr2 to output2, fill out output1 with null (with same number of tokens)
        while (j < matchJ) {
          output1.push(null);
          output2.push(arr2[j]);
          mismatchFlags.push(true);
          j++;
        }
        // Then add all tokens to output1 from arr1 and fill arr2 with same number of tokens but with null 
        while (i < matchI) {
          output1.push(arr1[i]);
          output2.push(null);
          mismatchFlags.push(true);
          i++;
        }

        // Add matching tokens to both outputs
        output1.push(arr1[i]);
        output2.push(arr2[j]);
        mismatchFlags.push(false);
        i++;
        j++;
      } else {
        // No match found, just add remaining tokens
        output1.push(arr1[i]);
        output2.push(null);
        mismatchFlags.push(true);
        i++;
      }
    }
  }
  // Fill out the second array with remaining tokens separated from null (until end of arr2)
  while (j < arr2.length) {
    if (arr2[j] !== null) {
      output1.push(null);
      output2.push(arr2[j]);
      mismatchFlags.push(true);
    }
    j++;
  }
  // Remove any null-tokens which have the same position in both arrays
  for (let n = 0; n < output1.length; n++){
    if(output1[n] === null && output2[n] === null){
      output1.splice(n,1);
      output2.splice(n,1);
      mismatchFlags.splice(n,1);
      n--;
    }
  }
  return [output1, output2, mismatchFlags];
}

// Returns an array of true/false where words does align or not
function getMisalignedFlags(arr1, arr2){
  const mismatchFlags = [];
  for(let i = 0; i < arr1.length; i++){
    if(arr1[i] === '[CLS]' || arr1[i] === '[SEP]') continue;
    mismatchFlags.push(arr1[i] !== arr2[i]);
  }
  return mismatchFlags;
}

// Creates a visualization for a row, using D3
function visualizeAlignmentSingle(doc, textLabel, documentID, notation=null, mismatchFlags=null, isPredictedClass) {
  const container = d3.select(`#compareGridContainer${documentID}`);

  const row = container.append("div")
    .attr("class", "grid-row d-flex align-items-center mb-0");

  const height = 20;
  const labelWidth = 45;

  //Labels for each grade and row
  const labelGroup = row.append("div")
    .attr("class", "label-group me-2")
    .attr("x", 0)
    .style("width", `${labelWidth}px`)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .attr("fill", "#000")
    .text(textLabel);

  if (notation) {
    labelGroup.attr("title", notation);
  }

  const svg = row.append("svg")
    .attr("class", "compare-grid-svg");

  const zoomGroup = svg.append("g")
    .attr("class", "zoom-group");

  // Button for collapse panel
  const collapseId = `${documentID}-${textLabel.replace(/\s+/g, '-')}`;
  const buttonContainer = row.append("div");
  buttonContainer.append("button")
    .attr("class", "btn btn-sm btn-secondary ms-2 px-1 py-0")
    .attr("type", "button")
    .attr("data-bs-toggle", "collapse")
    .attr("data-bs-target", `#${collapseId}_collapse`)
    .text("▼");

  // Collapse panel
  const collapse = container.append("div")
    .attr("class", `collapse mt-1${isPredictedClass ? " show" : ""}`) //Open the classified document
    .attr("id", `${collapseId}_collapse`);

  // Get and add the colored sentance to the dropdown container
  const sentence = createColoredSentence(doc, mismatchFlags);
  collapse.append("div")
    .attr("class", "card card-body bg-white border-1 p-2")
    .attr("id", `${collapseId}_text`)
    .node()
    .appendChild(sentence);

  //Synchronizes zoom behavior
  const zoom = d3.zoom()
    .on("zoom", (event) => {
      //Update the shared transform state for this document
      documentZoomStates[documentID].currentTransform = event.transform;
      
      //Apply transform to all zoom groups in this document
      documentZoomStates[documentID].zooms.forEach(({zoomGroup, svg: otherSvg}) => {
        //Trigger zoom event for each zoomGroup
        zoomGroup.attr("transform", `translate(${event.transform.x}, 0) scale(${event.transform.k}, 1)`);
        //Sync the internal zoom state of all SVGs without triggering zoom events
        otherSvg.property("__zoom", event.transform);
      });
    });
  
  //Apply zoom to this svg
  svg.call(zoom);
  //Store reference to this specific zoom group
  documentZoomStates[documentID].zooms.push({
    svg: svg,
    zoomGroup: zoomGroup,
    zoom: zoom
  });

  const colorScale = d3.scaleLinear()
    .domain([-1, 0, 1])
    .range([
      "rgb(255,140,0)", // negative
      "white",          // zero
      "rgb(0,0,255)"    // positive
    ]);

  //Debounce to be able to update the d3 visualization on window resize 
  const debouncedUpdateGrid = debounce(updateGrid, 300); //Set time of 0.3s before updating
  //Save the resizeObserver to be able to remove it upon update/when re-run
  const resizeObserver = new ResizeObserver(debouncedUpdateGrid);
  resizeObserver.observe(container.node());
  documentZoomStates[documentID].observers.push(resizeObserver);
  function updateGrid() {
    const width = row.node().clientWidth; //Recalculate width for every resize
    zoom.translateExtent([[0, 0], [width, 0]]) //allow horizontal only and update the new width

    svg.attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "none");

    const xScale = d3.scaleBand()
      .domain(d3.range(doc.length))
      .range([0, width])
      .padding(0.05);

    //Enable or disable zoom based on rectangle width
    const rectWidth = xScale.bandwidth();
    if (rectWidth < 12 && rectWidth > 0) {
      zoom.scaleExtent([1, (15/rectWidth)]);//cramped => allow zoom 
      svg.call(zoom);
    } else {
      zoom.scaleExtent([1, 1]);
      //Reset both this SVG and the shared state when not cramped
      documentZoomStates[documentID].currentTransform = d3.zoomIdentity;
      svg.call(zoom.transform, d3.zoomIdentity);
      svg.on(".zoom", null);//not cramped => no zoom
    }

    //Add rectangles to zoom container, for each rectangle add token and also tooltip with token and weight
    const rects = zoomGroup.selectAll("rect")
      .data(doc)
      .join("rect")
      .attr("x", (_, i) => xScale(i))
      .attr("y", 0)
      .attr("width", xScale.bandwidth())
      .attr("height", height)
      .attr("fill", d =>
        d[1] == null ? "rgba(255, 0, 0, 0)" : colorScale(d[1])
      )
      .attr("stroke", d => d[1] != null ? "#999999" : null)
      .attr("stroke-width", d => d[1] != null ? 0.2 : null);

    rects.filter(d => d[1] != null)
      .selectAll("title")
      .data(d => [d]) // one title per rect
      .join("title")
      .text(d => `${d[0]}: ${d[1].toFixed(4)}`);
  }
  //debounce function to limit how often functions is called
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  updateGrid();
}

//Aligns tokens to weights by iterating through the tokens and weights simultaneously, and filling in null for any tokens that dont have a corresponding weight (like [CLS] and [SEP])
function alignTokensToWeight(tokens, weights) {
  let output = [];
  let weightIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "[CLS]" || token === "[SEP]") {
      weightIdx++;
      continue;
    }
    if (token === null) {
      output.push([token, null]);
    } else {
      const weight = weights[weightIdx][1];
      output.push([token, weight]);
      weightIdx++;
    }
  }
  return output;
}