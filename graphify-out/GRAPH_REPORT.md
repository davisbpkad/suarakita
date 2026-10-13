# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 20 files · ~14,250 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 235 nodes · 344 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- Correction & Notes Engine
- Product Concepts & Architecture
- UI Components & Clipboard
- Legacy Vanilla Frontend
- NPM Manifest & Vite Config
- Speech Recognition Engine
- NPM Dependencies
- API Client

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 13 edges
2. `SuaraKita Application` - 12 edges
3. `GeminiClient` - 9 edges
4. `speak()` - 9 edges
5. `generateMeetingNotesWithAI()` - 8 edges
6. `generateMeetingNotesWithNLP()` - 8 edges
7. `correctTranscriptWithNLP()` - 7 edges
8. `vue` - 7 edges
9. `copyToClipboard()` - 7 edges
10. `ApiClient` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `correctTranscriptWithAI()`  [EXTRACTED]
  netlify/functions/correct-transcript.js → corrector.js
- `Vite Bundler Configuration (vite.config.mjs)` --references--> `Built JS Bundle Reference (/build/assets/app.js)`  [INFERRED]
  README.md → public/index.html
- `Tailwind UI Stylesheet (resources/css/app.css)` --references--> `Built CSS Stylesheet Reference (/build/assets/app.css)`  [INFERRED]
  README.md → public/index.html
- `Vue 3 Bootstrap (resources/js/app.js)` --shares_data_with--> `Vue 3 Application Root Mount (#app)`  [INFERRED]
  README.md → public/index.html
- `Warm Compact Design System` --references--> `Plus Jakarta Sans Web Font`  [INFERRED]
  README.md → public/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Build and Deploy Flow** — vite_config_bundler, netlify_config, readme_netlify_functions, public_index_html_entry [EXTRACTED 1.00]
- **Dual Engine Backend Split** — readme_dual_engine, readme_local_nlp_engine, readme_gemini_ai, lib_geminiclient_client [EXTRACTED 1.00]
- **Voice to Corrected Minutes Pipeline** — readme_voice_to_text, readme_phonetic_correction, readme_meeting_notes, resources_js_lib_text_transcript_util [EXTRACTED 1.00]

## Communities (10 total, 2 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (31): api, autoScrollTick, charCount, correctionData, currentLangObj, currentLanguage, formattedRecordingTime, geminiApiKey (+23 more)

### Community 1 - "Correction & Notes Engine"
Cohesion: 0.09
Nodes (32): correctTranscriptWithAI(), correctTranscriptWithNLP(), { GeminiClient, DEFAULT_MODELS }, ORAL_CONTRACTIONS, TECH_ACRONYMS, DEFAULT_MODELS, GeminiClient, https (+24 more)

### Community 2 - "Product Concepts & Architecture"
Cohesion: 0.08
Nodes (31): Corrector Engine (corrector.js), GeminiClient, Meeting Notes Engine (meetingNotes.js), netlify.toml Deployment Configuration, Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font (+23 more)

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

### Community 7 - "NPM Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-vue (+1 more)

## Knowledge Gaps
- **9 isolated node(s):** `autoprefixer`, `postcss`, `tailwindcss`, `STT Language List (lib/speech/languages.js)`, `File Download Helper (lib/utils/download.js)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 110 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Components & Clipboard` to `App Shell & State`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `postcss`, `tailwindcss` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.05391120507399577 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Correction & Notes Engine` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Should `Correction & Notes Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.08527131782945736 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Product Concepts & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.08377896613190731 - nodes in this community are weakly interconnected._