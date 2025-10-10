import "./style.css";
import {
  generateTextStreaming,
  getCurrentDate,
  handleCopyToClipboard,
} from "./script.js";

const { year, formattedDate } = getCurrentDate();

document.querySelector("#app").innerHTML = `
  <div class="container">
        <h1>AI Text Generator</h1>
        <input type="text" id="promptInput" placeholder="Enter your prompt" />
        <button id="generateButton">Generate</button>
        <div class="output-container">
          <button id="copyButton" class="copy-button" title="Copy to clipboard">
            <img src="/copy.svg" alt="Copy" width="18" height="18">
          </button>
          <div id="copyTooltip" class="copy-tooltip">Copied!</div>
          <pre id="output"></pre>
        </div>
        <p id="costDisplay"></p>
  </div>
  <footer class="footer">
    © ${year} javakhishvili.anri@kiu.edu.ge - ${formattedDate}
  </footer>
`;

document
  .getElementById("generateButton")
  .addEventListener("click", generateTextStreaming);

document
  .getElementById("copyButton")
  .addEventListener("click", handleCopyToClipboard);
