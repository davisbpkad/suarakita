# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 33 files · ~21,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 309 nodes · 480 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- Correction & Notes Engine
- Netlify Functions & CORS
- NPM Manifest & Vite Config
- Product Concepts & Architecture
- UI Components & Safe Markup
- Provider Catalog & OpenAI Client
- Speech Recognition Engine
- Provider Options & Concepts
- AI Config & Workspace UI
- Microphone Level Monitor
- Gemini Client
- API Client

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `OpenAiCompatibleClient` - 11 edges
3. `GeminiClient` - 11 edges
4. `createClient()` - 10 edges
5. `ApiClient` - 9 edges
6. `generateMeetingNotesWithNLP()` - 8 edges
7. `buildCorsHeaders()` - 8 edges
8. `vue` - 8 edges
9. `Optional LLM Providers` - 8 edges
10. `generateMeetingNotesStream()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `runCorrection()` --calls--> `parseTagged()`  [EXTRACTED]
  resources/js/App.vue → lib/taggedOutput.mjs
- `index.html Web Entry Point` --references--> `SuaraKita`  [INFERRED]
  public/index.html → README.md
- `runMeetingNotes()` --calls--> `parseTagged()`  [EXTRACTED]
  resources/js/App.vue → lib/taggedOutput.mjs
- `runMeetingNotes()` --calls--> `toBulletList()`  [EXTRACTED]
  resources/js/App.vue → lib/taggedOutput.mjs
- `correctTranscriptStream()` --calls--> `createClient()`  [EXTRACTED]
  corrector.js → lib/llmClient.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Real-Time Speech-to-Text Capture Flow** — readme_voice_to_text_realtime, readme_web_speech_recognition_api, readme_speech_recognizer, readme_mic_level_meter [INFERRED]
- **LLM Provider Selection and Fallback Flow** — readme_dual_engine, readme_llm_providers, readme_provider_catalog, readme_fallback_chain, readme_sse_streaming [INFERRED]
- **Netlify Serverless Backend Flow** — readme_netlify_serverless, readme_netlify_functions, readme_cors_restriction, readme_express_server [INFERRED]

## Communities (13 total, 2 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (34): api, autoScrollTick, charCount, correctionData, currentLangObj, currentLanguage, formattedRecordingTime, geminiApiKey (+26 more)

### Community 1 - "Correction & Notes Engine"
Cohesion: 0.12
Nodes (31): buildCorrectionPrompt(), correctTranscriptStream(), correctTranscriptWithAI(), correctTranscriptWithNLP(), { createClient, modelChainFor }, ORAL_CONTRACTIONS, TECH_ACRONYMS, createClient() (+23 more)

### Community 2 - "Netlify Functions & CORS"
Cohesion: 0.09
Nodes (20): { buildCorsHeaders }, { correctTranscriptWithAI }, handler(), buildCorsHeaders(), headerValue(), { buildCorsHeaders }, { correctTranscriptWithNLP }, { generateMeetingNotesWithAI } (+12 more)

### Community 3 - "NPM Manifest & Vite Config"
Cohesion: 0.07
Nodes (28): author, dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite (+20 more)

### Community 4 - "Product Concepts & Architecture"
Cohesion: 0.08
Nodes (28): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), ApiClient (backend endpoint caller), Automatic Paragraph Every 400 Words, CORS Restricted to Own Origin (+20 more)

### Community 5 - "UI Components & Safe Markup"
Cohesion: 0.10
Nodes (20): copySuccess, copyTranscript(), download(), emit, props, selectLanguage(), showDownloadMenu, showLangMenu (+12 more)

### Community 6 - "Provider Catalog & OpenAI Client"
Cohesion: 0.12
Nodes (13): https, { postSse }, https, postSse(), { GeminiClient }, { getProvider, modelChainFor }, { OpenAiCompatibleClient }, https (+5 more)

### Community 7 - "Speech Recognition Engine"
Cohesion: 0.17
Nodes (8): Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions(), PARAGRAPH_WORD_INTERVAL, paragraphize(), separatorBefore(), wordCount()

### Community 8 - "Provider Options & Concepts"
Cohesion: 0.15
Nodes (19): Non-Standard Abbreviation Normalization, Cerebras, corrector.js (cleaning and phonetic correction engine), Dual Engine (Local NLP plus optional LLM), Tiered Model Fallback, Filler Word Cleanup, Google Gemini, Groq (+11 more)

### Community 9 - "AI Config & Workspace UI"
Cohesion: 0.15
Nodes (9): vue, changeProvider(), currentProvider, emit, props, providerList, emit, props (+1 more)

### Community 10 - "Microphone Level Monitor"
Cohesion: 0.29
Nodes (4): isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor

## Knowledge Gaps
- **21 isolated node(s):** `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)`, `Plus Jakarta Sans Web Font`, `autoprefixer` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 136 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `AI Config & Workspace UI` to `App Shell & State`, `NPM Manifest & Vite Config`, `UI Components & Safe Markup`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **What connects `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.05391120507399577 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Correction & Notes Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.11746031746031746 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Netlify Functions & CORS` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Netlify Functions & CORS` be split into smaller, more focused modules?**
  _Cohesion score 0.08817204301075268 - nodes in this community are weakly interconnected._