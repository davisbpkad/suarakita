# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 26 files · ~15,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 260 nodes · 379 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- Correction & Notes Engine
- Product Concepts & Architecture
- UI Components & Clipboard
- Legacy Vanilla Frontend
- NPM Manifest & Vite Config
- Microphone Level Monitor
- Speech Recognition Engine
- Transcript Paragraphing
- NPM Dependencies
- API Client

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `SuaraKita` - 10 edges
3. `speak()` - 9 edges
4. `generateMeetingNotesWithAI()` - 8 edges
5. `generateMeetingNotesWithNLP()` - 8 edges
6. `GeminiClient` - 7 edges
7. `copyToClipboard()` - 7 edges
8. `vue` - 7 edges
9. `correctTranscriptWithNLP()` - 7 edges
10. `appendTranscriptCleanly()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `correctTranscriptWithAI()`  [EXTRACTED]
  netlify/functions/correct-transcript.js → corrector.js
- `Warm Modern Compact Design` --references--> `Plus Jakarta Sans Web Font`  [INFERRED]
  README.md → public/index.html
- `index.html Web Entry Point` --references--> `SuaraKita`  [INFERRED]
  public/index.html → README.md
- `generateMeetingNotesWithAI()` --calls--> `GeminiClient`  [EXTRACTED]
  meetingNotes.js → lib/geminiClient.js
- `handler()` --calls--> `generateMeetingNotesWithAI()`  [EXTRACTED]
  netlify/functions/meeting-notes.js → meetingNotes.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual Engine Correction Flow** — readme_local_nlp_engine, readme_gemini_ai, readme_corrector_engine, readme_dual_engine [INFERRED 0.85]
- **Netlify Serverless Deployment Stack** — readme_netlify_deployment, readme_netlify_functions, readme_netlify_toml [EXTRACTED 1.00]
- **Meeting Minutes Generation Pipeline** — readme_meeting_notes_engine, readme_meeting_notes, readme_decisions_made, readme_pic_deadline [EXTRACTED 1.00]

## Communities (12 total, 3 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (34): api, autoScrollTick, charCount, correctionData, currentLangObj, currentLanguage, formattedRecordingTime, geminiApiKey (+26 more)

### Community 1 - "Correction & Notes Engine"
Cohesion: 0.08
Nodes (32): correctTranscriptWithAI(), correctTranscriptWithNLP(), { GeminiClient, DEFAULT_MODELS }, ORAL_CONTRACTIONS, TECH_ACRONYMS, DEFAULT_MODELS, GeminiClient, https (+24 more)

### Community 2 - "Product Concepts & Architecture"
Cohesion: 0.06
Nodes (39): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), ApiClient (resources/js/lib/api/client.js), Auto Paragraphing Every 400 Words, Contextual Transcript Correction (+31 more)

### Community 3 - "UI Components & Clipboard"
Cohesion: 0.09
Nodes (21): vue, copySuccess, copyTranscript(), download(), emit, props, selectLanguage(), showDownloadMenu (+13 more)

### Community 4 - "Legacy Vanilla Frontend"
Cohesion: 0.13
Nodes (16): clearHighlights(), getHistory(), highlightWordAt(), pauseSpeech(), performMultiSpeakerReconstruction(), prepareHighlightWords(), renderHistory(), renderSpeakerTimeline() (+8 more)

### Community 5 - "NPM Manifest & Vite Config"
Cohesion: 0.10
Nodes (19): author, description, keywords, license, main, name, scripts, build (+11 more)

### Community 6 - "Microphone Level Monitor"
Cohesion: 0.26
Nodes (4): isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor

### Community 8 - "Transcript Paragraphing"
Cohesion: 0.38
Nodes (7): applyCorrection(), appendTranscriptCleanly(), collapseExcessiveRepetitions(), PARAGRAPH_WORD_INTERVAL, paragraphize(), separatorBefore(), wordCount()

### Community 9 - "NPM Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-vue (+1 more)

## Knowledge Gaps
- **16 isolated node(s):** `autoprefixer`, `postcss`, `tailwindcss`, `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 123 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Components & Clipboard` to `App Shell & State`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.276) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `postcss`, `tailwindcss` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.051207729468599035 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Correction & Notes Engine` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Should `Correction & Notes Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.07676767676767676 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`, `Transcript Paragraphing`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `Product Concepts & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.06477732793522267 - nodes in this community are weakly interconnected._