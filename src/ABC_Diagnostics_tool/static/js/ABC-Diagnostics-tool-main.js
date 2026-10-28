// The main constants, data, and the entry point for the web app

"use strict";

// Script entry point
const onDocumentReady = (callback) => {
  if (document.readyState != "loading")
    callback();
  else
    document.addEventListener("DOMContentLoaded", callback);
}

onDocumentReady(() => { 
  toggleNavbarLoadingSpinner(false);

  // Setup the main event handlers
  setupHandlers();

  // Create the initial empty document
  createDocumentPanel();

  // Create the color legend
  colorLegendSetup();

  // Setup about and help button listener
  setupAboutAndHelp();

  // Setup unhide all documents button
  initUnhideAllHiddenDocsBtn();

  //Initialize tooltips
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
});


// Helper function for the spinner (loading indicator) in the top navbar
function toggleNavbarLoadingSpinner(setVisible){
  const spinner = document.querySelector("#navbarLoadingSpinner");

  if (setVisible) {
    spinner.classList.remove("invisible");
  } else {
    spinner.classList.add("invisible");
  }
}

// Sets up the main event handlers
function setupHandlers() {

  // Modifications modal
  const modificationsModal = document.querySelector("#modificationsModal");

  // Modifications modal event listeners
  modificationsModal.querySelector("#modificationsModalConfirm").addEventListener("click", onModificationsModalConfirm);
  modificationsModal.addEventListener("show.bs.modal", onModificationsModalShow);
  modificationsModal.addEventListener("hidden.bs.modal", onModificationsModalHidden);
 
  // Alignment settings event listener
  document.getElementById("alignTokensSetting").addEventListener("change", () => {
    //Get the settings attribute id
    const alignmentSetting = document.querySelector('input[name="radioDefault"]:checked').id;
    //Re-run the visualizeDocuments for each document with processed results
    DOCUMENTS.forEach((doc) => {
      if(doc.processingResults) visualizeDocuments(doc.id, doc.parentDocumentID, alignmentSetting);
    });
  });
}

// Sets up the color legend at the top 
function colorLegendSetup() {
  const legendContainer = d3.select("#colorLegend");

  // Styling for legend
  const width = 200;
  const height = 40;
  const marginLeft = 10;
  const marginRight = 10;

  const svg = legendContainer
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  //Color scale from orange to blue
  const colorScale = d3.scaleLinear()
    .domain([-1, 0, 1])
    .range([
      "rgb(255,140,0)", 
      "white",
      "rgb(0,0,255)"
    ]);

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  linearGradient.selectAll("stop")
    .data(colorScale.range())
    .enter()
    .append("stop")
    .attr("offset", (d, i) => `${(i / (colorScale.range().length - 1)) * 100}%`)
    .attr("stop-color", d => d);

  const legendWidth = width - marginLeft - marginRight;

  svg.append("rect")
    .attr("x", marginLeft)
    .attr("width", legendWidth)
    .attr("height", 15)
    .style("fill", "url(#legend-gradient)");

  const axisScale = d3.scaleLinear()
    .domain([-1, 1])
    .range([marginLeft, width - marginRight]);

  svg.append("g")
    .attr("transform", "translate(0, 17)")
    .call(d3.axisBottom(axisScale).ticks(5).tickFormat(d3.format(".1f")))
    .style("font-size", "12px");
}

