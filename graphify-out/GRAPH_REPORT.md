# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 26 files · ~14,250 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 246 nodes · 360 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- Correction & Notes Engine
- Product Concepts & Architecture
- UI Components & Clipboard
- Legacy Vanilla Frontend
- NPM Manifest & Vite Config
- Speech Recognition Engine
- Microphone Level Monitor
- NPM Dependencies
- API Client

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `SuaraKita` - 12 edges
3. `GeminiClient` - 9 edges
4. `speak()` - 9 edges
5. `generateMeetingNotesWithAI()` - 8 edges
6. `generateMeetingNotesWithNLP()` - 8 edges
7. `correctTranscriptWithNLP()` - 7 edges
8. `copyToClipboard()` - 7 edges
9. `vue` - 7 edges
10. `ApiClient` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `correctTranscriptWithAI()`  [EXTRACTED]
  netlify/functions/correct-transcript.js → corrector.js
- `Warm Compact Design System` --references--> `Plus Jakarta Sans Web Font`  [INFERRED]
  README.md → public/index.html
- `index.html Web Entry Point` --references--> `SuaraKita`  [INFERRED]
  public/index.html → README.md
- `correctTranscriptWithAI()` --calls--> `GeminiClient`  [EXTRACTED]
  corrector.js → lib/geminiClient.js
- `generateMeetingNotesWithAI()` --calls--> `GeminiClient`  [EXTRACTED]
  meetingNotes.js → lib/geminiClient.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Transcript Correction Flow** — readme_koreksi_transkrip, readme_corrector_engine, readme_local_nlp_engine, readme_gemini_ai [EXTRACTED 1.00]
- **Meeting Notes Generation Flow** — readme_notulen_rapat, readme_meetingnotes_engine, readme_geminiclient, readme_netlify_functions [EXTRACTED 1.00]
- **Frontend Stack and Design** — readme_vue3, readme_tailwind_css, readme_vite, readme_design_system [EXTRACTED 1.00]

## Communities (11 total, 2 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (34): api, autoScrollTick, charCount, correctionData, currentLangObj, currentLanguage, formattedRecordingTime, geminiApiKey (+26 more)

### Community 1 - "Correction & Notes Engine"
Cohesion: 0.09
Nodes (32): correctTranscriptWithAI(), correctTranscriptWithNLP(), { GeminiClient, DEFAULT_MODELS }, ORAL_CONTRACTIONS, TECH_ACRONYMS, DEFAULT_MODELS, GeminiClient, https (+24 more)

### Community 2 - "Product Concepts & Architecture"
Cohesion: 0.08
Nodes (28): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), ApiClient (resources/js/lib/api/client.js), AppHeader Component, Corrector Engine (corrector.js) (+20 more)

### Community 3 - "UI Components & Clipboard"
Cohesion: 0.09
Nodes (21): vue, copySuccess, copyTranscript(), download(), emit, props, selectLanguage(), showDownloadMenu (+13 more)

### Community 4 - "Legacy Vanilla Frontend"
Cohesion: 0.13
Nodes (16): clearHighlights(), getHistory(), highlightWordAt(), pauseSpeech(), performMultiSpeakerReconstruction(), prepareHighlightWords(), renderHistory(), renderSpeakerTimeline() (+8 more)

### Community 5 - "NPM Manifest & Vite Config"
Cohesion: 0.10
Nodes (19): author, description, keywords, license, main, name, scripts, build (+11 more)

### Community 6 - "Speech Recognition Engine"
Cohesion: 0.18
Nodes (4): Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions()

### Community 7 - "Microphone Level Monitor"
Cohesion: 0.29
Nodes (4): isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor

### Community 8 - "NPM Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-vue (+1 more)

## Knowledge Gaps
- **16 isolated node(s):** `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)`, `autoprefixer`, `postcss` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 122 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Components & Clipboard` to `App Shell & State`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.290) - this node is a cross-community bridge._
- **What connects `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.04995374653098982 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Correction & Notes Engine` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Should `Correction & Notes Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.08527131782945736 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Product Concepts & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.08387096774193549 - nodes in this community are weakly interconnected._