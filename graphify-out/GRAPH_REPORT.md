# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- Corpus is ~14,250 words - fits in a single context window. You may not need a graph.

## Summary
- 214 nodes · 316 edges · 14 communities (10 shown, 4 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Correction & Notes Engine
- Product Concepts & Architecture
- Vue UI State & Handlers
- Legacy Vanilla Frontend
- NPM Manifest & Vite Config
- Speech Recognition Engine
- NPM Dependencies
- API Client
- Language Catalog
- Download Helpers
- Recording Controls
- Vue Entrypoint
- Language Switch

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 13 edges
2. `SuaraKita Application` - 12 edges
3. `GeminiClient` - 9 edges
4. `speak()` - 9 edges
5. `generateMeetingNotesWithNLP()` - 8 edges
6. `generateMeetingNotesWithAI()` - 8 edges
7. `correctTranscriptWithNLP()` - 7 edges
8. `appendTranscriptCleanly()` - 7 edges
9. `correctTranscriptWithAI()` - 6 edges
10. `scripts` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `correctTranscriptWithAI()`  [EXTRACTED]
  netlify/functions/correct-transcript.js → corrector.js
- `index.html Web Entry Point` --references--> `SuaraKita Application`  [INFERRED]
  public/index.html → README.md
- `Warm Compact Design System` --references--> `Plus Jakarta Sans Web Font`  [INFERRED]
  README.md → public/index.html
- `Vite Bundler Configuration (vite.config.mjs)` --references--> `Built JS Bundle Reference (/build/assets/app.js)`  [INFERRED]
  README.md → public/index.html
- `Vue 3 Bootstrap (resources/js/app.js)` --shares_data_with--> `Vue 3 Application Root Mount (#app)`  [INFERRED]
  README.md → public/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Voice to Corrected Minutes Pipeline** — readme_voice_to_text, readme_phonetic_correction, readme_meeting_notes, resources_js_lib_text_transcript_util [EXTRACTED 1.00]
- **Dual Engine Backend Split** — readme_dual_engine, readme_local_nlp_engine, readme_gemini_ai, lib_geminiclient_client [EXTRACTED 1.00]
- **Build and Deploy Flow** — vite_config_bundler, netlify_config, readme_netlify_functions, public_index_html_entry [EXTRACTED 1.00]

## Communities (14 total, 4 thin omitted)

### Community 0 - "Correction & Notes Engine"
Cohesion: 0.09
Nodes (32): correctTranscriptWithAI(), correctTranscriptWithNLP(), { GeminiClient, DEFAULT_MODELS }, ORAL_CONTRACTIONS, TECH_ACRONYMS, DEFAULT_MODELS, GeminiClient, https (+24 more)

### Community 1 - "Product Concepts & Architecture"
Cohesion: 0.08
Nodes (31): Corrector Engine (corrector.js), GeminiClient, Meeting Notes Engine (meetingNotes.js), netlify.toml Deployment Configuration, Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font (+23 more)

### Community 2 - "Vue UI State & Handlers"
Cohesion: 0.06
Nodes (22): api, charCount, copySuccess, correctionData, currentLanguage, formattedRecordingTime, geminiApiKey, hasApiKey (+14 more)

### Community 3 - "Legacy Vanilla Frontend"
Cohesion: 0.13
Nodes (16): clearHighlights(), getHistory(), highlightWordAt(), pauseSpeech(), performMultiSpeakerReconstruction(), prepareHighlightWords(), renderHistory(), renderSpeakerTimeline() (+8 more)

### Community 4 - "NPM Manifest & Vite Config"
Cohesion: 0.10
Nodes (19): author, description, keywords, license, main, name, scripts, build (+11 more)

### Community 5 - "Speech Recognition Engine"
Cohesion: 0.18
Nodes (4): Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions()

### Community 6 - "NPM Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-vue (+1 more)

### Community 8 - "Language Catalog"
Cohesion: 0.40
Nodes (4): currentLangObj, DEFAULT_LANGUAGE, findLanguage(), LANGUAGES

### Community 9 - "Download Helpers"
Cohesion: 0.50
Nodes (4): downloadMomMarkdown(), downloadTranscript(), fileTimestamp(), triggerDownload()

### Community 10 - "Recording Controls"
Cohesion: 0.40
Nodes (5): recognizer, scrollToBottom(), startRecording(), stopRecording(), toggleRecording()

## Knowledge Gaps
- **9 isolated node(s):** `autoprefixer`, `postcss`, `tailwindcss`, `SuaraKita Live Demo`, `Multi-Language Dictation (id-ID, en-US, ja-JP, ar-SA)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 98 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `Vue Entrypoint` to `Vue UI State & Handlers`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `postcss`, `tailwindcss` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Correction & Notes Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.08527131782945736 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Correction & Notes Engine` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Should `Product Concepts & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.08377896613190731 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `Vue UI State & Handlers`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `Vue UI State & Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._