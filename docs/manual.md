# ABC Diagnostics Tool for Supporting AI-Based Essay Classification — Manual

## About This Application

### Purpose
This tool is designed to support AI-based essay classification by providing transparency into how automated systems evaluate written text. It helps users understand how their writing is analyzed and graded by machine learning models — and crucially, <em>why</em> a particular grade was assigned.

### What It Does
The application classifies text into CEFR grade levels (A1, A2, B1, B2, C1) using a transformer-based language model. Beyond just producing a grade, it uses <strong>feature attribution</strong> to explain which individual words and tokens drove that decision. This makes the model's reasoning visible rather than treating it as a black box.

### How Word Weights Are Calculated
Word importance is computed using <strong>Integrated Gradients</strong>, an explainability technique from the <em>transformers-interpret</em> library. The method works by imagining a path from a neutral "baseline" input (e.g. all-zero embeddings) to the actual input, and measuring how much each token's presence along that path contributed to the final classification score. The result is an attribution score per token — a number that reflects how strongly that word pushed the model toward or away from the predicted grade.

hese attributions are calculated at the <strong>embedding layer</strong> using Layer Attribution, meaning the scores reflect each word's influence as interpreted through the model's internal representations, not just surface-level word frequency.

### Key Features
<ul>
<li><strong>Text Analysis</strong> - Evaluates writing samples and assigns CEFR classification grades (A1, A2, B1, B2, C1)</li>
<li><strong>Integrated Gradient Attribution</strong> - Uses Integrated Gradients to assign each word a contribution score relative to the predicted class</li>
<li><strong>Visual Feedback</strong> - Color-coded word highlighting maps attribution scores to a visual scale (orange = negative impact on predicted grade, blue = positive impact)</li>
<li><strong>Version Comparison</strong> - Compare how edits to your text shift both the classification and individual word attributions</li>
<li><strong>Transparency</strong> - Surfaces the model's internal reasoning so you can understand and interrogate the scoring process</li>
</ul>

### Who Is This For
This tool is valuable for educators, students, researchers, and anyone interested in understanding how AI systems classify written text. It can be used to explore model bias, study what linguistic features correlate with CEFR levels, or develop a deeper understanding of automated essay scoring.


## How to Use This Tool

### Getting Started
Enter your text in the input boxes on the screen. You can work with multiple documents at once to compare results side by side.

### Processing Your Text
Once you've entered your text, click the blue <strong>Process</strong> button to analyze it. The model will classify your writing and run <strong>Integrated Gradients</strong> to compute a contribution score for each word.

### Understanding the Results
After processing, you'll see:
<ul>
<li><strong>Classification result</strong> - The predicted CEFR grade level (A1, A2, B1, B2, C1)</li>
<li><strong>Colored bar charts</strong> - Visual breakdown of the model's confidence across all grade categories</li>
<li><strong>Word highlighting</strong> - Each word is colored based on its <strong>word attribution score</strong> from Integrated Gradients. Words highlighted in <strong style="color: rgb(0, 0, 255);">blue</strong> positively contributed to the predicted grade; words in <strong style="color: rgb(255,140,0);">orange</strong> had a negative or opposing influence. The intensity of the color reflects the magnitude of the attribution.</li>
</ul>

### What Are Attribution Scores?
Attribution scores tell you how much each word influenced the model's decision. They are computed using <strong>Integrated Gradients</strong>, which traces how the model's output changes as each token is gradually "introduced" from a neutral baseline. A high positive score means that word was important in confirming the predicted grade; a negative score means it pulled the model toward a different grade. Words with near-zero scores had little effect on the outcome.

### Additional Features
<ul>
<li><strong>New Version</strong> - Create a new version of your document to compare attribution changes after edits</li>
<li><strong>Modifications</strong> - Make targeted changes to your text and reprocess to see how attributions shift</li>
<li><strong>Hide</strong> button - Toggle visibility of individual document panels (Hidden documents cannot be brought back)</li>
<li><strong>Word importance scale</strong> - The gradient in the top right is your legend: orange indicates words with a negative attribution (reducing confidence in the predicted grade), blue indicates words with a positive attribution (increasing confidence)</li>
</ul>

Type your text, click Process, and use the word highlighting and attribution scores to understand exactly how your writing is being classified.

