---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #090a14
color: #f1f5f9
style: |
  section {
    font-family: 'Outfit', 'Segoe UI', -apple-system, sans-serif;
    background: radial-gradient(circle at 10% 20%, #15182e 0%, #080912 100%);
    color: #e2e8f0;
    padding: 50px 80px;
    font-size: 24px;
    background-size: cover;
  }
  h1 {
    font-size: 48px;
    background: linear-gradient(135deg, #00f0ff 0%, #ff2a5f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 20px;
    font-weight: 800;
  }
  h2 {
    font-size: 36px;
    color: #00f0ff;
    border-bottom: 2px solid rgba(255, 42, 95, 0.4);
    padding-bottom: 8px;
    margin-top: 0;
    font-weight: 700;
  }
  h3 {
    font-size: 28px;
    color: #ffd269;
    margin-top: 15px;
    margin-bottom: 10px;
  }
  footer {
    font-size: 14px;
    color: #4b5563;
    position: absolute;
    bottom: 20px;
    left: 80px;
  }
  header {
    font-size: 14px;
    color: #4b5563;
    position: absolute;
    top: 20px;
    left: 80px;
  }
  span.highlight-cyan {
    color: #00f0ff;
    font-weight: bold;
  }
  span.highlight-pink {
    color: #ff2a5f;
    font-weight: bold;
  }
  span.highlight-gold {
    color: #ffd269;
    font-weight: bold;
  }
  div.grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-top: 15px;
  }
  div.grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-top: 15px;
  }
  div.card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
  }
  div.card-active {
    background: rgba(0, 240, 255, 0.03);
    border: 1px solid rgba(0, 240, 255, 0.3);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.1);
    backdrop-filter: blur(8px);
  }
  div.card-pink {
    background: rgba(255, 42, 95, 0.03);
    border: 1px solid rgba(255, 42, 95, 0.3);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px 0 rgba(255, 42, 95, 0.1);
    backdrop-filter: blur(8px);
  }
  ul, ol {
    margin-top: 5px;
    margin-bottom: 5px;
  }
  li {
    margin-bottom: 8px;
  }
  blockquote {
    background: rgba(255, 255, 255, 0.05);
    border-left: 4px solid #ff2a5f;
    padding: 10px 20px;
    margin: 15px 0;
    border-radius: 0 8px 8px 0;
  }
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    margin-top: 15px !important;
  }
  th {
    background: rgba(0, 240, 255, 0.1) !important;
    color: #00f0ff !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding: 12px 20px !important;
    font-weight: bold !important;
  }
  td {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    padding: 12px 20px !important;
    background: transparent !important;
    color: #cbd5e1 !important;
  }
  tr {
    background: transparent !important;
  }
  tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.01) !important;
  }
---

# LatentLearn 🧠🌲

### A Spatial, Non-Linear Learning Space for Divergent Minds

<div style="margin-top: 40px; font-size: 20px; color: #94a3b8;">

  <strong>Tech Stack:</strong> Next.js / FastAPI / Stateful LangGraph / Google AI Studio / Gemma 4<br>
  <strong>Target:</strong> 2026 AI Agent Innovation Pitch & Demo
</div>

<!-- _footer: LatentLearn Project Roadshow Presentation -->

---

## 01. The "Linear Trap" of Traditional AI Interaction

### Waterfall chat threads (like standard ChatGPT) create severe cognitive bottlenecks for associative learners:

<div class="grid-2">
  <div class="card">
    <h3>🍂 1. Context Pollution</h3>
    <p style="font-size: 18px; line-height: 1.6;">
      When exploring tangents or details, the conversational history becomes cluttered with secondary, off-topic details.
      <br><br>
      <span class="highlight-pink">Consequence:</span> The LLM's understanding of the primary subject degrades due to noise in the prompt window.
    </p>
  </div>
  <div class="card">
    <h3>🌲 2. Losing the Trunk</h3>
    <p style="font-size: 18px; line-height: 1.6;">
      Returning to the core subject after a deep dive requires massive scrolling and a high cognitive load.
      <br><br>
      <span class="highlight-cyan">Consequence:</span> Frequent disruption of flow state, causing users to get lost and abandon study sessions.
    </p>
  </div>
</div>

---

## 02. The Spatial Paradigm: Breaking the Linear Trap

### We represent the learning journey as a hierarchical "Focus Tree" on a spatial, interactive canvas

<div class="grid-2">
  <div class="card-active" style="display: flex; flex-direction: column; justify-content: center;">
    <h3 style="margin-top: 0;"><span class="highlight-cyan">💡 Core Philosophy</span></h3>
    <p style="font-size: 18px; line-height: 1.6; margin-bottom: 0;">
      Divergent minds (ADHD or associative thinkers) learn in branches, not straight lines.<br><br>
      We empower users to <strong>spawn infinite sub-branches</strong> for tangential curiosity and <strong>collapse them cleanly</strong> to return to the core trunk.
    </p>
  </div>
  <div style="display: flex; flex-direction: column; justify-content: space-between;">
    <div class="card" style="padding: 12px 20px;">
      <h4 style="margin: 0; color: #00f0ff;">📍 Inline Branching</h4>
      <p style="font-size: 15px; margin: 5px 0 0 0; color: #94a3b8;">Highlight any word in AI responses to instantly spawn a localized sub-node card without cluttering history.</p>
    </div>
    <div class="card" style="padding: 12px 20px;">
      <h4 style="margin: 0; color: #ff2a5f;">🛡️ Cognitive Guardrails</h4>
      <p style="font-size: 15px; margin: 5px 0 0 0; color: #94a3b8;">Background drift detection alerts you when tangents go too far, offering a 1-click return prompt.</p>
    </div>
    <div class="card" style="padding: 12px 20px;">
      <h4 style="margin: 0; color: #ffd269;">🌲 Focus Tree Visualizer</h4>
      <p style="font-size: 15px; margin: 5px 0 0 0; color: #94a3b8;">Side-drawer displays learning nodes. Bi-directional sync allows rapid canvas auto-focus.</p>
    </div>
  </div>
</div>

---

## 03. Interaction Experience & UI Aesthetics

<div class="grid-2">
  <div>
    <h3>✨ 1. Premium Glassmorphic UI</h3>
    <p style="font-size: 18px; line-height: 1.6;">
      Frosted glass card aesthetics (`backdrop-filter`) with responsive light/dark theme support. Micro-animations and smooth zoom transitions provide highly tactile user feedback.
    </p>
    <h3>📍 2. Touchpoint Context Menu</h3>
    <p style="font-size: 18px; line-height: 1.6;">
      Dragging to highlight words instantly triggers a floating popover menu with <code style="color: #00f0ff;">Ask</code>, <code style="color: #ff2a5f;">Explain</code>, and <code style="color: #ffd269;">Expand</code> options, anchoring curiosity contextually.
    </p>
  </div>
  <div>
    <h3>🛡️ 3. Drift Inheritance & Reset</h3>
    <p style="font-size: 18px; line-height: 1.6;">
      Sub-branches of an already off-topic parent node inherit the off-topic status. Canvas alerts present a <span class="highlight-pink">"Refocus"</span> trigger to spring back to the nearest core trunk.
    </p>
    <h3>✅ 4. Resolution & Decluttering</h3>
    <p style="font-size: 18px; line-height: 1.6;">
      Clicking "Got it " collapses and fades out tangential branches. The canvas auto-focuses back to the parent node, maintaining clean, clutter-free spatial environments.
    </p>
  </div>
</div>

---

## 04. Technical Architecture: Decoupled & Asynchronous

<div style="text-align: center; margin-top: 10px;">
  
</div>

<div class="grid-3" style="font-size: 16px;">
  <div class="card">
    <h4 style="margin: 0; color: #00f0ff; font-size: 18px;">🌐 Next.js Frontend</h4>
    <p style="margin: 8px 0; line-height: 1.5; color: #cbd5e1;">
      Built with <strong>React 18</strong> and TypeScript 5.<br>
      • Custom <strong>Server-Sent Events (SSE)</strong> streaming parser.<br>
      • Local state reducers handle tree node spawning, folding, and camera pan auto-focus.
    </p>
  </div>
  <div class="card">
    <h4 style="margin: 0; color: #ffd269; font-size: 18px;">⚡ FastAPI Web Gateway</h4>
    <p style="margin: 8px 0; line-height: 1.5; color: #cbd5e1;">
      Asynchronous endpoints maximize concurrency.<br>
      • <strong>Security Sandbox:</strong> Cleans input via strict sanitization to block prompt injections.<br>
      • <strong>Real-time Streams:</strong> Establishes persistent SSE pipelines.
    </p>
  </div>
  <div class="card">
    <h4 style="margin: 0; color: #ff2a5f; font-size: 18px;">🌲 LangGraph Agent Engine</h4>
    <p style="margin: 8px 0; line-height: 1.5; color: #cbd5e1;">
      Stateful multi-agent DAG orchestration.<br>
      • <strong>Checkpointer System:</strong> Saves and resumes chat states on specific nodes.<br>
      • <strong>Google AI Studio:</strong> Securely schedules Google's premium Gemma 4 model.
    </p>
  </div>
</div>

---

## 05. The Multi-Agent Brain: Stateful LangGraph DAG

### Stateful nodes coordinate intent routing, structural query decomposition, context anchoring, and off-topic evaluations

<div class="grid-2">
  <div style="display: flex; align-items: center; justify-content: center;">
    <img src="image.png" alt="LangGraph DAG" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; height: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />
  </div>
  <div style="display: flex; flex-direction: column; justify-content: space-between;">
    <div class="card" style="padding: 8px 12px; margin-bottom: 6px;">
      <span style="color: #00f0ff; font-weight: bold; font-size: 15px;">1. `intent_router` (Intent Classifier)</span>
      <p style="font-size: 13px; margin: 2px 0 0 0; color: #94a3b8;">Classifies user query to trigger the correct pipeline.</p>
    </div>
    <div class="card" style="padding: 8px 12px; margin-bottom: 6px;">
      <span style="color: #ffd269; font-weight: bold; font-size: 15px;">2. `decomposer` (Query Decomposer)</span>
      <p style="font-size: 13px; margin: 2px 0 0 0; color: #94a3b8;">Splits compound queries into sequential sub-questions.</p>
    </div>
    <div class="card" style="padding: 8px 12px; margin-bottom: 6px;">
      <span style="color: #4ade80; font-weight: bold; font-size: 15px;">3. `tutor` & `anchor_locator`</span>
      <p style="font-size: 13px; margin: 2px 0 0 0; color: #94a3b8;">Anchors source context and streams markdown responses.</p>
    </div>
    <div class="card" style="padding: 8px 12px;">
      <span style="color: #ff2a5f; font-weight: bold; font-size: 15px;">4. `offtopic_eval` (Drift Evaluator)</span>
      <p style="font-size: 13px; margin: 2px 0 0 0; color: #94a3b8;">Flags semantic deviations from the document summary.</p>
    </div>
  </div>
</div>

---

## 06. Core Technical Breakthroughs

<div class="grid-2">
  <div class="card-pink">
    <h3>📡 1. SSE Stream Token Filtering</h3>
    <hr style="border-color: rgba(255, 42, 95, 0.2);">
    <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">
      <strong>The Pain:</strong> When intermediate agents (decomposer, tree-writer) output structured JSONs, standard streaming dumps JSON code directly into user chat bubbles.
      <br><br>
      <strong>The Solve:</strong> Engineered an
      <span class="highlight-pink">Event-Stream Node Whitelist filter</span>.
      Uses underlying `astream_events` to intercept tokens, passing to frontend ONLY when the event is of type `on_chat_model_stream` and generated by the <code style="color:#00f0ff;">tutor</code> node.
    </p>
  </div>
  <div class="card-active">
    <h3>🌲 2. Drift Inheritance & Early Exit</h3>
    <hr style="border-color: rgba(0, 240, 255, 0.2);">
    <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">
      <strong>Off-Topic Inheritance:</strong> Sub-questions asked on a parent node that is already off-topic automatically inherit the off-topic flag, eliminating expensive LLM validation runs.
      <br><br>
      <strong>Early Exit Optimization:</strong> Under decomposition mode, once `anchor_locator` flags sub-questions, the state machine triggers an
      <span class="highlight-cyan">Early-Exit short-circuit</span>, bypassing the expensive tutor generation to immediately dispatch the structured QuestionPlan.
    </p>
  </div>
</div>

---

## 07. Developer Experience: Visual Traces & Telemetry

<div class="grid-2">
  <div class="card">
    <h3>🖼️ 1. LangGraph Studio Local GUI</h3>
    <p style="font-size: 18px; line-height: 1.6; color: #cbd5e1;">
      Fully integrated with <strong>LangGraph CLI tooling</strong>. Running <code style="color:#00f0ff;">langgraph dev</code> launches an interactive visual workbench:
    </p>
    <ul style="font-size: 16px; color: #94a3b8;">
      <li><strong>Live Execution Path:</strong> Watch node highlights shift in real-time as state moves through the graph.</li>
      <li><strong>State Time-Travel:</strong> Interactively modify, rewind, and re-run state variables to mock edge-cases and test errors.</li>
    </ul>
  </div>
  <div class="card-active">
    <h3>📈 2. LangSmith Observability</h3>
    <p style="font-size: 18px; line-height: 1.6; color: #cbd5e1;">
      Production-grade observability through <strong>LangSmith Deep Tracing Integration</strong>:
    </p>
    <ul style="font-size: 16px; color: #94a3b8;">
      <li><strong>Call-level Tracing:</strong> Inspect inputs, outputs, system prompts, latency, and exact token costs for each step.</li>
      <li><strong>Data Feedback Loops:</strong> Group runs as good/bad to construct regression test suites, systematically optimizing prompts.</li>
    </ul>
  </div>
</div>

---

## 08. The Intelligent Learning Pipeline

<div style="margin-top: 10px;">
  <table style="width: 100%; border-collapse: collapse; font-size: 15px; text-align: left;">
    <thead>
      <tr style="background: rgba(0, 240, 255, 0.1); color: #00f0ff;">
        <th style="width: 22%;">Core Pillar</th>
        <th style="width: 25%;">Backend Agent Logic</th>
        <th style="width: 28%;">Intelligent Mechanism</th>
        <th style="width: 25%;">Cognitive UX Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="highlight-gold">1. Query Decomposition</span><br></td>
        <td>• <code>decomposer</code> node<br>• Structured QuestionPlan schema</td>
        <td>• Early-Exit optimization<br>• User intent classifier</td>
        <td>Avoids information dump;<br>Splits compound questions sequentially</td>
      </tr>
      <tr>
        <td><span class="highlight-cyan">2. Dynamic Branching</span><br></td>
        <td>• <code>tree_writer</code> node<br>• Anchor locator coordinate maps</td>
        <td>• Local state reducer synchronization<br>• Precise quote anchoring</td>
        <td>Prevents vertical scroll chaos;<br>Preserves exploration history</td>
      </tr>
      <tr>
        <td><span class="highlight-pink">3. Off-Topic Guardrails</span><br></td>
        <td>• <code>offtopic_eval</code> node<br>• Stored document-summary check</td>
        <td>• Drift status inheritance<br>• 1-click refocusing guardrails</td>
        <td>Detects topic drift in real-time;<br>Gently guides focus back to core</td>
      </tr>
    </tbody>
  </table>
</div>

---

# Let thoughts grow freely, discover depth in connections.

<blockquote>
  "The mind is not a vessel to be filled, but a fire to be kindled." —— Plutarch
</blockquote>

<div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: center;">
  <div>
    <p style="font-size: 16px; margin: 5px 0 0 0; color: #64748b;">Thank you for your watch! </p>
  </div>
  <div style="text-align: right;">
  </div>
</div>
