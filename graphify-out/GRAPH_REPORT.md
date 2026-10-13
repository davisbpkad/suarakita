# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 30 files · ~19,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 303 nodes · 483 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- Correction & Notes Engine
- UI Components & Clipboard
- NPM Manifest & Vite Config
- Product Concepts & Providers
- Provider Catalog & OpenAI Client
- Legacy Vanilla Frontend
- Speech Recognition Engine
- Microphone Level Monitor
- Gemini Client
- API Client

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `GeminiClient` - 11 edges
3. `OpenAiCompatibleClient` - 11 edges
4. `createClient()` - 10 edges
5. `generateMeetingNotesWithAI()` - 10 edges
6. `speak()` - 9 edges
7. `generateMeetingNotesWithNLP()` - 9 edges
8. `ApiClient` - 9 edges
9. `SuaraKita` - 9 edges
10. `correctTranscriptWithNLP()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Warm Compact Design System` --references--> `Plus Jakarta Sans Web Font`  [INFERRED]
  README.md → public/index.html
- `index.html Web Entry Point` --references--> `SuaraKita`  [INFERRED]
  public/index.html → README.md
- `handler()` --calls--> `correctTranscriptWithAI()`  [EXTRACTED]
  netlify/functions/correct-transcript.js → corrector.js
- `runCorrection()` --calls--> `parseTagged()`  [EXTRACTED]
  resources/js/App.vue → lib/taggedOutput.mjs
- `handler()` --calls--> `correctTranscriptWithNLP()`  [EXTRACTED]
  netlify/functions/meeting-notes.js → corrector.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Optional LLM Provider Choice** — readme_google_gemini, readme_groq, readme_cerebras, readme_openrouter [EXTRACTED 1.00]
- **Netlify Deployment Flow** — readme_netlify_deployment, readme_netlify_functions, readme_vite_bundler [EXTRACTED 1.00]
- **Transcript to Minutes Pipeline** — readme_voice_to_text, readme_contextual_correction, readme_meeting_notes [EXTRACTED 1.00]

## Communities (12 total, 3 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (39): parseTagged(), stripFences(), toBulletList(), api, autoScrollTick, charCount, correctionData, currentLangObj (+31 more)

### Community 1 - "Correction & Notes Engine"
Cohesion: 0.10
Nodes (36): buildCorrectionPrompt(), correctTranscriptStream(), correctTranscriptWithAI(), correctTranscriptWithNLP(), { createClient, modelChainFor }, ORAL_CONTRACTIONS, TECH_ACRONYMS, createClient() (+28 more)

### Community 2 - "UI Components & Clipboard"
Cohesion: 0.07
Nodes (26): vue, changeProvider(), currentProvider, emit, props, providerList, copySuccess, copyTranscript() (+18 more)

### Community 3 - "NPM Manifest & Vite Config"
Cohesion: 0.07
Nodes (29): author, dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite (+21 more)

### Community 4 - "Product Concepts & Providers"
Cohesion: 0.08
Nodes (32): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), ApiClient, Cerebras, Smart Contextual Transcript Correction (+24 more)

### Community 5 - "Provider Catalog & OpenAI Client"
Cohesion: 0.12
Nodes (13): https, { postSse }, https, postSse(), { GeminiClient }, { getProvider, modelChainFor }, { OpenAiCompatibleClient }, https (+5 more)

### Community 6 - "Legacy Vanilla Frontend"
Cohesion: 0.13
Nodes (16): clearHighlights(), getHistory(), highlightWordAt(), pauseSpeech(), performMultiSpeakerReconstruction(), prepareHighlightWords(), renderHistory(), renderSpeakerTimeline() (+8 more)

### Community 7 - "Speech Recognition Engine"
Cohesion: 0.17
Nodes (8): Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions(), PARAGRAPH_WORD_INTERVAL, paragraphize(), separatorBefore(), wordCount()

### Community 8 - "Microphone Level Monitor"
Cohesion: 0.18
Nodes (7): toTagged(), isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor, f, round

## Knowledge Gaps
- **16 isolated node(s):** `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)`, `autoprefixer`, `postcss` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Components & Clipboard` to `App Shell & State`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.050170068027210885 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Correction & Notes Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.10188261351052048 - nodes in this community are weakly interconnected._
- **Should `UI Components & Clipboard` be split into smaller, more focused modules?**
  _Cohesion score 0.07301587301587302 - nodes in this community are weakly interconnected._
- **Should `NPM Manifest & Vite Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06653225806451613 - nodes in this community are weakly interconnected._