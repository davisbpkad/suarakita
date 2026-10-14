# Graph Report - web-saya  (2026-10-14)

## Corpus Check
- 39 files · ~17,954 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .toml 1)

## Summary
- 317 nodes · 518 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `740527ce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.vue
- llmClient.js
- AppHeader.vue
- sentenceSplit.js
- meetingNotes.js
- package.json
- SuaraKita
- taggedOutput.mjs
- SpeechRecognizer
- Optional LLM Providers
- MicMonitor
- ApiClient

## God Nodes (most connected - your core abstractions)
1. `SpeechRecognizer` - 12 edges
2. `GeminiClient` - 11 edges
3. `OpenAiCompatibleClient` - 11 edges
4. `createClient()` - 10 edges
5. `generateMeetingNotesWithNLP()` - 10 edges
6. `generateMeetingNotesWithAI()` - 10 edges
7. `ApiClient` - 9 edges
8. `correctTranscriptWithNLP()` - 8 edges
9. `correctTranscriptWithAI()` - 8 edges
10. `generateMeetingNotesStream()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `generateMeetingNotesWithNLP()` --calls--> `splitSentences()`  [EXTRACTED]
  meetingNotes.js → lib/sentenceSplit.js
- `runCorrection()` --calls--> `parseTagged()`  [EXTRACTED]
  resources/js/App.vue → lib/taggedOutput.mjs
- `index.html Web Entry Point` --references--> `SuaraKita`  [INFERRED]
  public/index.html → README.md
- `handler()` --calls--> `correctTranscriptWithNLP()`  [EXTRACTED]
  netlify/functions/meeting-notes.js → corrector.js
- `correctTranscriptWithAI()` --calls--> `createClient()`  [EXTRACTED]
  corrector.js → lib/llmClient.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LLM Provider Selection and Fallback Flow** — readme_dual_engine, readme_llm_providers, readme_provider_catalog, readme_fallback_chain, readme_sse_streaming [INFERRED]
- **Netlify Serverless Backend Flow** — readme_netlify_serverless, readme_netlify_functions, readme_cors_restriction, readme_express_server [INFERRED]
- **Real-Time Speech-to-Text Capture Flow** — readme_voice_to_text_realtime, readme_web_speech_recognition_api, readme_speech_recognizer, readme_mic_level_meter [INFERRED]

## Communities (12 total, 1 thin omitted)

### Community 0 - "App.vue"
Cohesion: 0.06
Nodes (36): api, autoScrollTick, charCount, correctionData, currentLangObj, currentLanguage, downloadMomMarkdown(), downloadTranscript() (+28 more)

### Community 1 - "llmClient.js"
Cohesion: 0.09
Nodes (14): GeminiClient, https, { postSse }, https, postSse(), { GeminiClient }, { getProvider, modelChainFor }, { OpenAiCompatibleClient } (+6 more)

### Community 2 - "AppHeader.vue"
Cohesion: 0.07
Nodes (30): vue, changeProvider(), currentProvider, emit, props, providerList, copySuccess, copyTranscript() (+22 more)

### Community 3 - "sentenceSplit.js"
Cohesion: 0.21
Nodes (11): chunkByWords(), DISCOURSE_MARKERS, MARKER_RE, splitLongSentence(), splitSentences(), wordsOf(), denganNamun, hasil (+3 more)

### Community 4 - "meetingNotes.js"
Cohesion: 0.08
Nodes (45): buildCorrectionPrompt(), correctTranscriptStream(), correctTranscriptWithAI(), correctTranscriptWithNLP(), { createClient, modelChainFor }, ORAL_CONTRACTIONS, TECH_ACRONYMS, createClient() (+37 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (28): author, dependencies, autoprefixer, express, postcss, tailwindcss, @tailwindcss/vite, vite (+20 more)

### Community 6 - "SuaraKita"
Cohesion: 0.08
Nodes (28): Built JS Bundle Reference (/build/assets/app.js), Built CSS Stylesheet Reference (/build/assets/app.css), index.html Web Entry Point, Plus Jakarta Sans Web Font, Vue 3 Application Root Mount (#app), ApiClient (backend endpoint caller), Automatic Paragraph Every 400 Words, CORS Restricted to Own Origin (+20 more)

### Community 7 - "taggedOutput.mjs"
Cohesion: 0.31
Nodes (8): parseTagged(), stripFences(), toBulletList(), toTagged(), runCorrection(), runMeetingNotes(), f, round

### Community 8 - "SpeechRecognizer"
Cohesion: 0.16
Nodes (9): applyCorrection(), Ctor(), SpeechRecognizer, appendTranscriptCleanly(), collapseExcessiveRepetitions(), PARAGRAPH_WORD_INTERVAL, paragraphize(), separatorBefore() (+1 more)

### Community 9 - "Optional LLM Providers"
Cohesion: 0.15
Nodes (19): Non-Standard Abbreviation Normalization, Cerebras, corrector.js (cleaning and phonetic correction engine), Dual Engine (Local NLP plus optional LLM), Tiered Model Fallback, Filler Word Cleanup, Google Gemini, Groq (+11 more)

### Community 10 - "MicMonitor"
Cohesion: 0.26
Nodes (4): isQuiet(), QUIET_RMS, rmsLevel(), MicMonitor

## Knowledge Gaps
- **21 isolated node(s):** `autoprefixer`, `postcss`, `tailwindcss`, `Built JS Bundle Reference (/build/assets/app.js)`, `Built CSS Stylesheet Reference (/build/assets/app.css)` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `AppHeader.vue` to `App.vue`, `package.json`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `postcss`, `tailwindcss` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.059800664451827246 - nodes in this community are weakly interconnected._
- **Why does `SpeechRecognizer` connect `SpeechRecognizer` to `App.vue`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `llmClient.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._
- **Why does `express` connect `meetingNotes.js` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `AppHeader.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06923076923076923 - nodes in this community are weakly interconnected._