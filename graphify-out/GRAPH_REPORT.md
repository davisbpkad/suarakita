# Graph Report - web-saya  (2026-10-13)

## Corpus Check
- 35 files · ~22,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 327 nodes · 502 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & State
- LLM Clients
- UI Components & Safe Markup
- Correction & Notes Engine
- Netlify Functions & CORS
- NPM Manifest & Vite Config
- Product Concepts & Architecture
- Corrector Engine
- Speech Recognition Engine
- Provider Options & Concepts
- Microphone Level Monitor
- API Client
- AI Config UI

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `OpenAiCompatibleClient` - 11 edges
3. `GeminiClient` - 11 edges
4. `ApiClient` - 9 edges
5. `Optional LLM Providers` - 8 edges
6. `generateMeetingNotesWithNLP()` - 8 edges
7. `vue` - 8 edges
8. `createClient()` - 7 edges
9. `corrector.js (cleaning and phonetic correction engine)` - 7 edges
10. `SuaraKita` - 7 edges

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
- **LLM Provider Selection and Fallback Flow** — readme_dual_engine, readme_llm_providers, readme_provider_catalog, readme_fallback_chain, readme_sse_streaming [INFERRED]
- **Netlify Serverless Backend Flow** — readme_netlify_serverless, readme_netlify_functions, readme_cors_restriction, readme_express_server [INFERRED]
- **Real-Time Speech-to-Text Capture Flow** — readme_voice_to_text_realtime, readme_web_speech_recognition_api, readme_speech_recognizer, readme_mic_level_meter [INFERRED]

## Communities (13 total, 1 thin omitted)

### Community 0 - "App Shell & State"
Cohesion: 0.05
Nodes (34): api, autoScrollTick, charCount, correctionData, currentLangObj, currentLanguage, formattedRecordingTime, geminiApiKey (+26 more)

### Community 1 - "LLM Clients"
Cohesion: 0.09
Nodes (14): GeminiClient, https, { postSse }, https, postSse(), { GeminiClient }, { getProvider, modelChainFor }, { OpenAiCompatibleClient } (+6 more)

### Community 2 - "UI Components & Safe Markup"
Cohesion: 0.08
Nodes (24): vue, copySuccess, copyTranscript(), download(), emit, props, selectLanguage(), showDownloadMenu (+16 more)

### Community 3 - "Correction & Notes Engine"
Cohesion: 0.11
Nodes (28): chunkByWords(), DISCOURSE_MARKERS, MARKER_RE, splitLongSentence(), splitSentences(), wordsOf(), buildMeetingNotesPrompt(), CASUAL_PATTERNS (+20 more)

### Community 4 - "Netlify Functions & CORS"
Cohesion: 0.08
Nodes (18): { buildCorsHeaders }, { correctTranscriptWithAI }, buildCorsHeaders(), headerValue(), { buildCorsHeaders }, { correctTranscriptWithNLP }, { generateMeetingNotesWithAI }, { buildCorsHeaders } (+10 more)

### Community 5 - "NPM Manifest & Vite Config"
Cohesion: 0.07
Nodes (28): author, dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite (+20 more)

### Community 6 - "Product Concepts & Architecture"
Cohesion: 0.08
Nodes (28): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), ApiClient (backend endpoint caller), Automatic Paragraph Every 400 Words, CORS Restricted to Own Origin (+20 more)

### Community 7 - "Corrector Engine"
Cohesion: 0.16
Nodes (16): buildCorrectionPrompt(), correctTranscriptStream(), correctTranscriptWithAI(), correctTranscriptWithNLP(), { createClient, modelChainFor }, ORAL_CONTRACTIONS, TECH_ACRONYMS, createClient() (+8 more)

### Community 8 - "Speech Recognition Engine"
Cohesion: 0.17
Nodes (8): Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions(), PARAGRAPH_WORD_INTERVAL, paragraphize(), separatorBefore(), wordCount()

### Community 9 - "Provider Options & Concepts"
Cohesion: 0.15
Nodes (19): Non-Standard Abbreviation Normalization, Cerebras, corrector.js (cleaning and phonetic correction engine), Dual Engine (Local NLP plus optional LLM), Tiered Model Fallback, Filler Word Cleanup, Google Gemini, Groq (+11 more)

### Community 10 - "Microphone Level Monitor"
Cohesion: 0.29
Nodes (4): isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor

### Community 12 - "AI Config UI"
Cohesion: 0.40
Nodes (5): changeProvider(), currentProvider, emit, props, providerList

## Knowledge Gaps
- **21 isolated node(s):** `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)`, `server.js (Express localhost server)`, `markdownInline.mjs (anti-XSS badge/bold render)` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 148 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Components & Safe Markup` to `App Shell & State`, `AI Config UI`, `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)`, `Vue 3 Application Root Mount (#app)` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & State` be split into smaller, more focused modules?**
  _Cohesion score 0.05391120507399577 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `Speech Recognition Engine` to `App Shell & State`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `LLM Clients` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Netlify Functions & CORS` to `NPM Manifest & Vite Config`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `UI Components & Safe Markup` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._