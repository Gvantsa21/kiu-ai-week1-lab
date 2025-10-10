const API_KEY = import.meta.env.VITE_AI_API_KEY;
import { marked } from "marked";

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function calculateCost(inputTokens, outputTokens) {
  const INPUT_COST_PER_1K = 0.00025;
  const OUTPUT_COST_PER_1K = 0.0005;
  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  };
}

function getCurrentDate() {
  const currentDate = new Date();
  const options = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = currentDate.toLocaleDateString("en-US", options);
  return {
    year: currentDate.getFullYear(),
    formattedDate: formattedDate,
  };
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries - 1) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function generateTextStreaming() {
  const prompt = document.getElementById("promptInput").value;
  const outputDiv = document.getElementById("output");
  const outputContainer = document.querySelector(".output-container");
  const costDisplay = document.getElementById("costDisplay");
  if (!prompt.trim()) {
    alert("Please enter a prompt!");
    return;
  }
  outputDiv.innerHTML = "";
  outputContainer.style.display = "block";
  costDisplay.textContent = "Cost: calculating...";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:streamGenerateContent?alt=sse&key=${API_KEY}`;
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  };
  const startTime = Date.now();
  try {
    const response = await fetchWithRetry(url, options);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";
    let usageMetadata = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const text = data.candidates[0].content.parts[0].text;
              fullText += text;
              outputDiv.innerHTML = marked.parse(fullText);
            }

            if (data.usageMetadata) {
              usageMetadata = data.usageMetadata;
            }
          } catch (e) {
            console.error("JSON parse error:", e);
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    let inputTokens, outputTokens;
    if (usageMetadata) {
      inputTokens = usageMetadata.promptTokenCount || 0;
      outputTokens = usageMetadata.candidatesTokenCount || 0;
    } else {
      inputTokens = estimateTokens(prompt);
      outputTokens = estimateTokens(fullText);
    }

    const cost = calculateCost(inputTokens, outputTokens);
    costDisplay.textContent = `Cost: $${cost.total.toFixed(
      6
    )} (Input: ${inputTokens} tokens, Output: ${outputTokens} tokens)`;
    console.log(`Duration: ${duration}ms`);
  } catch (error) {
    outputDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    costDisplay.textContent = "";
  }
}

async function handleCopyToClipboard() {
  const outputDiv = document.getElementById("output");
  const tooltip = document.getElementById("copyTooltip");

  try {
    await navigator.clipboard.writeText(outputDiv.textContent);

    tooltip.classList.add("show");

    setTimeout(() => {
      tooltip.classList.remove("show");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

export { generateTextStreaming, getCurrentDate, handleCopyToClipboard };
