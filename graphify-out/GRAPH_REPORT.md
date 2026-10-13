# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 33 files · ~21,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 310 nodes · 478 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- Product Concepts & Architecture
- UI Components & Safe Markup
- Netlify Functions & CORS
- NPM Manifest & Vite Config
- Correction & Notes Engine
- Provider Catalog & OpenAI Client
- Speech Recognition Engine
- Microphone Level Monitor
- Gemini Client
- API Client
- AI Config UI

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `GeminiClient` - 11 edges
3. `OpenAiCompatibleClient` - 11 edges
4. `createClient()` - 10 edges
5. `ApiClient` - 9 edges
6. `generateMeetingNotesWithNLP()` - 8 edges
7. `vue` - 8 edges
8. `Optional LLM Providers` - 8 edges
9. `generateMeetingNotesStream()` - 7 edges
10. `generateMeetingNotesWithAI()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `runCorrection()` --calls--> `parseTagged()`  [EXTRACTED]
  resources/js/App.vue → lib/taggedOutput.mjs
- `index.html Web Entry Point` --references--> `SuaraKita`  [INFERRED]
  public/index.html → README.md
- `correctTranscriptStream()` --calls--> `createClient()`  [EXTRACTED]
  corrector.js → lib/llmClient.js
- `correctTranscriptWithAI()` --calls--> `createClient()`  [EXTRACTED]
  corrector.js → lib/llmClient.js
- `generateMeetingNotesStream()` --calls--> `createClient()`  [EXTRACTED]
  meetingNotes.js → lib/llmClient.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LLM Provider Selection and Fallback Flow** — readme_dual_engine, readme_llm_providers, readme_provider_catalog, readme_fallback_chain, readme_sse_streaming [INFERRED]
- **Netlify Serverless Backend Flow** — readme_netlify_serverless, readme_netlify_functions, readme_cors_restriction, readme_express_server [INFERRED]
- **Real-Time Speech-to-Text Capture Flow** — readme_voice_to_text_realtime, readme_web_speech_recognition_api, readme_speech_recognizer, readme_mic_level_meter [INFERRED]

## Communities (12 total, 2 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (39): parseTagged(), stripFences(), toBulletList(), api, autoScrollTick, charCount, correctionData, currentLangObj (+31 more)

### Community 1 - "Product Concepts & Architecture"
Cohesion: 0.05
Nodes (47): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), Non-Standard Abbreviation Normalization, ApiClient (backend endpoint caller), Automatic Paragraph Every 400 Words (+39 more)

### Community 2 - "UI Components & Safe Markup"
Cohesion: 0.08
Nodes (24): vue, copySuccess, copyTranscript(), download(), emit, props, selectLanguage(), showDownloadMenu (+16 more)

### Community 3 - "Netlify Functions & CORS"
Cohesion: 0.08
Nodes (18): { buildCorsHeaders }, { correctTranscriptWithAI }, buildCorsHeaders(), headerValue(), { buildCorsHeaders }, { correctTranscriptWithNLP }, { generateMeetingNotesWithAI }, { buildCorsHeaders } (+10 more)

### Community 4 - "NPM Manifest & Vite Config"
Cohesion: 0.07
Nodes (28): author, dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite (+20 more)

### Community 5 - "Correction & Notes Engine"
Cohesion: 0.17
Nodes (23): buildCorrectionPrompt(), correctTranscriptStream(), correctTranscriptWithAI(), correctTranscriptWithNLP(), { createClient, modelChainFor }, ORAL_CONTRACTIONS, TECH_ACRONYMS, createClient() (+15 more)

### Community 6 - "Provider Catalog & OpenAI Client"
Cohesion: 0.12
Nodes (13): https, { postSse }, https, postSse(), { GeminiClient }, { getProvider, modelChainFor }, { OpenAiCompatibleClient }, https (+5 more)

### Community 7 - "Speech Recognition Engine"
Cohesion: 0.17
Nodes (8): Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions(), PARAGRAPH_WORD_INTERVAL, paragraphize(), separatorBefore(), wordCount()

### Community 8 - "Microphone Level Monitor"
Cohesion: 0.18
Nodes (7): toTagged(), isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor, f, round

### Community 11 - "AI Config UI"
Cohesion: 0.40
Nodes (5): changeProvider(), currentProvider, emit, props, providerList

## Knowledge Gaps
- **21 isolated node(s):** `autoprefixer`, `postcss`, `tailwindcss`, `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 138 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Components & Safe Markup` to `App Shell & State`, `AI Config UI`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `postcss`, `tailwindcss` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.050170068027210885 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Product Concepts & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.0545790934320074 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Netlify Functions & CORS` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `UI Components & Safe Markup` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._