# Roadmap V2 — Audit and Final Plan

Nov 11, 2026 · @Job

## 1. Scorecard of the V1 roadmap: 65 / 100

V1 picked the right project and the right evaluation philosophy, but it would not have been executed as written. Learning resources were generic, the scenario dataset (the critical path) was badly underestimated, and career preparation was crammed into the last week.

| Category | Weight | Score | Main reason |
| --- | --: | --: | --- |
| Job-market relevance | 15 | 12 | Covered the four skills every posting asks for. Missed how interviews actually test them (live LLM-API coding, debugging an agent, eval design questions). |
| AI engineering depth | 20 | 13 | Strong on agents, RAG and evaluation. Thin on model internals: no attention, no inference mechanics (prefill/decode, KV cache), no fine-tuning vs RAG reasoning. |
| Capstone project quality | 15 | 12 | Good choice with the right conditions. Root-cause labels were free text, which makes objective scoring hard, and tool-selection correctness had no labels to score against. |
| Feasibility and time management | 15 | 8 | Several days held 2–3 days of work. Scenario and document authoring (about 25 hours real effort) was hidden inside other tasks. No buffer days. |
| Learning effectiveness and resources | 15 | 6 | "Read the official docs" is not a curriculum. No chapters, no videos, no time estimates. AI-free exercises existed but only four. |
| Evaluation and production readiness | 10 | 8 | Baselines, held-out set and adversarial tests were right. The eval harness arrived on Day 15, too late to drive development, and LLM-as-judge was never validated. |
| Portfolio and interview preparation | 10 | 6 | Resume, mocks and applications all compressed into Days 22–30. Only three mock interviews. |
| **Total** | **100** | **65** |  |

**Five biggest weaknesses**

1. **No real learning resources.** Each day named a doc site, not a section, video or time budget.
2. **Dataset work underestimated.** 40 labelled scenarios plus about 30 documents plus retrieval labels is the most time-consuming part of the project, and V1 had no day dedicated to it.
3. **Overloaded days.** Day 1 (scaffold, Docker, client, experiment, tests), Day 5 (corpus, chunking, embeddings, pgvector, tool, labelled queries) and Day 6 (report schema, verifier, two baselines, first eval) are each 1.5–2 days of work for someone new to the domain.
4. **Evaluation not driving development.** The harness was built after the agent. Scoring by free-text root cause would have forced an unvalidated LLM judge into the critical metric.
5. **Career preparation back-loaded.** Applications started on Day 24, leaving no time for recruiter responses within the 30 days.

**Five strongest elements (kept in V2)**

1. IncidentOps with fixtures instead of a simulator, and scenarios designed to defeat the baseline.
2. Hand-written loop before LangGraph, so the framework is understood rather than copied.
3. A sealed held-out set run once, with honest reporting of bad results.
4. Approval gate enforced in code, independent of the model, with tests.
5. Spend limits, replay mode for the public demo, and cost recorded per run.

**Critical changes in V2**

- Every day names an exact resource, section and time budget. Learning is capped at about 23% of hours.
- Root causes become structured labels (service + fault type enum), so the main metric is deterministic. LLM-as-judge is used only for explanation quality and is validated against your own grades.
- Each scenario labels its required evidence and forbidden actions, which makes tool-use correctness and unsafe-action rate measurable.
- The baseline and the eval harness are built before the agent (Days 3–5).
- Two buffer days; dataset work gets its own scheduled blocks.
- Career work starts in Week 2; applications start Day 18.
- Model internals (Days 1–2) and inference economics (Day 19) are taught explicitly.

**Removed or demoted**

- Voyage vs local embedding comparison (P2)
- Circuit breaker, Langfuse, second provider, MCP (P2)
- Separate LangGraph parity evaluation on the full dev set (replaced by a 6-scenario smoke check)
- Live streaming UI (polling is enough)

**Biggest risk to the 30-day objective:** the scenario dataset. If the scenarios are too easy, the agent cannot beat the baseline; if they are inconsistent, every metric is noise. V2 front-loads dataset design and caps the count at 36 scenarios.

## 2. Audit findings

The project and topic coverage hold up against the market. Execution detail, assessment design and resources were the weak points. This audit reuses the 14 postings analysed in V1 (11 Nov 2026); no new market search was needed to reach these conclusions.

| Area | Finding | V2 change |
| --- | --- | --- |
| Market: missing skills | Postings ask for evals that gate releases, token and latency budgets, and explaining failure modes of non-deterministic systems. V1 covered these but never practised the interview formats that test them: live LLM-API coding, debugging an agent from transcripts, designing an eval. | 5 mock interviews, including a live no-Claude coding round (Day 28) and an eval-design round (Day 22). |
| Market: overemphasis | MCP, Langfuse, a second provider and a reranker each appeared in V1 scope. Postings mention them occasionally; none were essential. | All moved to P2. |
| Market: framework vs principles | LangGraph is named often in India postings, so it stays. But interviewers test whether you understand the loop, not the API. | Hand-written loop first (Day 5), LangGraph port only on Day 11, using a 1-hour course rather than a 4-hour one. |
| Capstone: business problem | Real and costly: incident triage time. Credible to interviewers because it matches your resume. | Kept. |
| Capstone: measurability | Free-text root causes would need an LLM judge for the main metric, which is weak evidence. | Structured labels: root cause = (service, fault type enum); each scenario lists required evidence and forbidden actions. Main metrics become deterministic. |
| Capstone: complexity | Approval API, UI, deployment and tracing are all justified, but only the eval and the agent are the AI story. | UI is one page with polling; tracing on Day 21 only after evals are solid. |
| AI depth: foundations | No attention, no inference mechanics, no fine-tuning reasoning. Interviewers ask "why is output slower than input?" and "why not fine-tune?". | Days 1–2 (transformer and attention videos), Day 19 (inference economics and fine-tuning vs RAG, with an ADR). |
| AI depth: RAG | Correct coverage. Reranking rightly gated on evidence. | Kept; Contextual Retrieval article used to frame what to test. |
| Feasibility | Days 1, 3, 5, 6, 15 overloaded; dataset authoring invisible; no buffer. | Dataset gets two dedicated sprints (Days 9, 13); two buffer days (14, 25); first-day scope reduced. |
| Learning effectiveness | Only four AI-free exercises; no recall checks. | Weekly recall quiz, 4 AI-free builds, 2 debugging-from-transcripts exercises, and a learning log that separates "I wrote" from "Claude wrote". |
| Evaluation | Harness came after the agent; no judge validation; no statistical treatment of 3 repeats. | Scorer from Day 4, harness v0 Day 5, judge validated against your own grades (Day 16), bootstrap intervals and pass^k reporting (Day 15). |
| Career | Everything on Days 22–30. | LinkedIn on Day 14, resume v1 and first applications Day 18, at least 15 applications by Day 30. |

## A. Final project specification: IncidentOps AI

**Business problem.** When a distributed system degrades, on-call engineers spend much of an incident correlating logs, traces, metrics, recent deploys and old runbooks before they can act. IncidentOps is an investigation assistant that does that correlation with read-only tools, cites its evidence, says when it does not know, and never takes action without human approval.

**Core functionality**

1. Accept an alert for a scenario and run a bounded investigation (max 12 tool calls, token budget, wall-clock timeout).
2. Query fixture telemetry through typed read-only tools: logs, traces, metrics, deploy history, config changes.
3. Retrieve relevant runbooks and past incidents from pgvector + Postgres full-text search.
4. Produce a structured report: ranked hypotheses as (service, fault type) with confidence, each claim linked to evidence IDs, or an explicit "insufficient evidence" outcome.
5. Verify every citation deterministically; drop or flag unverifiable claims.
6. Propose remediation; pause for human approval; run approved actions only against a simulated executor; write an audit record.

**Architecture** (unchanged from V1 in shape): one FastAPI service, one Postgres with pgvector, one agent (hand-written loop in Week 1, LangGraph from Day 11 with the Postgres checkpointer), an eval harness in the same repo, OpenTelemetry tracing, one HTMX page.

**Technology stack:** Python 3.12, FastAPI, Pydantic v2, Anthropic Python SDK (Haiku 5.5 for development; Sonnet 5.5 as comparison candidate), LangGraph, PostgreSQL + pgvector + tsvector, fastembed with bge-small-en-v1.5, pytest, OpenTelemetry + Jaeger, Docker Compose, GitHub Actions, one small VPS.

**AI-specific components and the evidence each must produce**

| Component | Why it exists | Measured by |
| --- | --- | --- |
| Tool-calling agent | Chooses which evidence to gather; the rule baseline cannot adapt to unusual scenarios | Top-1 / top-3 root-cause accuracy vs baseline, by scenario category |
| Retrieval over runbooks and incidents | Some root causes are only explained by documentation | Recall@5 and MRR on 25+ labelled queries; accuracy on runbook-dependent scenarios |
| Citation verifier | Turns hallucination into a countable event | Citation precision; share of claims dropped |
| Abstention | Wrong confident answers are worse than "I don't know" in incidents | False-confident rate on insufficient-evidence scenarios |
| Approval gate | Model output must never directly cause side effects | Unsafe-action rate (must be 0 executed), tests |
| Injection defences | Runbooks and logs are untrusted input | Attack success rate on 8 adversarial scenarios |
| Context and caching | Cost and latency budgets | Tokens, cost and p50/p95 latency per investigation |

**Scope limits.** 36 scenarios (24 dev, 12 held-out sealed until Day 22) plus 8 adversarial. About 25 synthetic documents. No live services, no real cloud integrations, no multi-agent design, no fine-tuning, no React. All data synthetic; nothing from any employer.

**Evaluation strategy.** Three systems on the same scenarios: rule-based correlator, single-shot RAG (retrieve then answer once), and the agent. Three repeats per scenario; report means with bootstrap intervals and pass^3 (succeeds on all three runs). Code-based graders for everything except explanation quality, which uses an LLM judge validated against 30 of your own grades. The held-out set is run once and reported as it is.

**Deployment approach.** Docker Compose on a small VPS. The public demo replays recorded investigations; live runs require a password and stop at a daily spend cap. A 3–5 minute demo video covers the case where the link is down.

## B. Prioritised curriculum

Ranked by how often hiring processes test the skill, then by how much the project depends on it. "Difficulty for you" accounts for your backend background.

| Rank | Skill | Hiring relevance | Difficulty for you | Where the project uses it | Depth needed in 30 days |
| --: | --- | --- | --- | --- | --- |
| 1 | Evaluation design: datasets, graders, baselines, variance, judge validation | Very high; the clearest senior signal | High (new way of thinking) | Whole project | Deep |
| 2 | Tool calling and agent loops: protocol, budgets, error handling, stopping | Very high | Medium | Investigator | Deep |
| 3 | Structured outputs and validation | Very high | Low | Report, labels, tools | Solid |
| 4 | RAG: chunking, embeddings, BM25, hybrid, Recall@K | Very high | Medium | Runbook and incident search | Solid |
| 5 | Context engineering, prompt caching, token cost | High | Low–medium | Tool output design, budgets | Solid |
| 6 | Prompt injection and least-privilege tools | High, rising | Medium | Adversarial scenarios, approval gate | Solid |
| 7 | Human-in-the-loop and durable state (LangGraph interrupts, checkpoints) | High | Low (it is orchestration) | Approval gate | Working |
| 8 | LLM observability (OTel GenAI conventions) | Medium–high | Low | Tracing | Working |
| 9 | LLM fundamentals: tokens, attention, sampling, prefill vs decode, KV cache | Medium (asked in screens) | Medium | Explaining latency and cost | Conceptual |
| 10 | Model selection on quality, latency, cost | Medium–high | Low | Haiku vs Sonnet ADR | Working |
| 11 | Fine-tuning vs RAG vs prompting | Medium (asked as a judgement question) | Medium | ADR only | Conceptual |
| 12 | MCP | Low–medium | Low | P2 only | Awareness |
| — | GPU serving (vLLM, TensorRT-LLM), training, multi-agent | Specialist roles only | High | Not used | Defer |

## C. Learning resource library

Free resources cover every topic well enough for this plan. The one paid item worth buying is Chip Huyen's *AI Engineering*: a single reference that covers evaluation, RAG, agents, inference optimisation and fine-tuning trade-offs in more depth than any free source. Two well-known paid courses were reviewed and rejected. Total structured learning: about 33–38 hours (19–22% of 172).

**Topic by topic: free vs paid**

| Topic | Best free | Best paid | Choice | Time |
| --- | --- | --- | --- | --- |
| LLM fundamentals | R1 + R2 (Karpathy, 3Blue1Brown) | R12 Ch. 2 | Free. The videos give better intuition than any text. | 2 h |
| Inference and latency | R3 selected chapters | R12 Ch. 9 | Paid if bought, else free. Ch. 9 is more systematic on latency and cost. | 1 h |
| Model API and tool calling | R4 + R5 (Anthropic course and docs) | None worth buying | Free | 3 h |
| Agent design and tools | R6 + R7 + R8 (Anthropic engineering posts) | None needed | Free | 2 h |
| RAG and retrieval | R9 + R10 (Contextual Retrieval, pgvector README) | DeepLearning.AI *Retrieval Augmented Generation* (about 26 h; first module free, rest needs a subscription) | Free. The paid course overlaps heavily and costs 26 hours you do not have. | 1.5 h |
| Evaluation | R11 + R13 + R14 (Anthropic, Hamel Husain, applied-llms.org) | Maven *AI Evals For Engineers & PMs*; R12 Ch. 3–4 | Free + book chapters. The Maven course is excellent but reported prices range from about $2,000 to $4,200 (**unverified**) and it runs on a cohort schedule. | 4 h |
| LangGraph | R15 (LangChain Academy, LangGraph Essentials) | None | Free | 1.5 h |
| Security | R16 + R17 (Willison, OWASP) | None | Free | 1 h |
| Observability | R18 (OpenTelemetry GenAI conventions) | None | Free | 0.5 h |
| Fine-tuning vs RAG | R14 "Strategy" part | R12 Ch. 7 (first section) | Either | 0.5 h |

**The library** (all URLs checked by search on 11 Nov 2026; YouTube links are to the exact video)

| ID | Resource | Creator | Cost | Length | Use exactly | Why, and which feature it supports |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | [\[1hr Talk\] Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g) | Andrej Karpathy | Free | 60 min | 00:00–21:05 (inference, training, fine-tuning into an assistant) and the security part from 45:43 | Fastest correct mental model; the security part introduces prompt injection. Day 1. Beginner–intermediate. |
| R2 | 3Blue1Brown [Ch. 5: Transformers](https://www.3blue1brown.com/lessons/gpt) and [Ch. 6: Attention](https://www.3blue1brown.com/lessons/attention) | Grant Sanderson | Free | 27 + 26 min | Both videos in full (each lesson page embeds the YouTube video) | Explains embeddings, attention and why context is costly, visually. Days 1–2. Intermediate. |
| R3 | [Deep Dive into LLMs like ChatGPT](https://www.youtube.com/watch?v=7xTGNNLPyMI) | Andrej Karpathy | Free | 3 h 31 min | Only the tokenization, inference, and hallucination / tool-use chapters, via the video's chapter list (about 60–75 min) | Why models hallucinate and how tool use helps. Day 19 if you do not buy R12. Intermediate. |
| R4 | [anthropics/courses](https://github.com/anthropics/courses) | Anthropic | Free (API cost only) | About 2 h used | *Tool use* course, lessons 1–4 (simple tool, forcing JSON with tools, full tool workflow); skim *API fundamentals* only for streaming | Hands-on notebooks for the exact protocol you implement. The notebooks default to an old Haiku model; switch to Haiku 5.5. Day 2. |
| R5 | [Claude developer docs](https://docs.claude.com) | Anthropic | Free | 1 h total | Pages: Messages API, Tool use overview, Structured outputs, Prompt caching, Pricing | Authoritative API behaviour and current prices. Days 1, 2, 10. |
| R6 | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Anthropic | Free | 25 min | Whole post; reread "When (and when not) to use agents" | Workflows vs agents: the core of your baseline-vs-agent argument. Days 4–5. Note the post says parts of the tooling landscape have since changed. |
| R7 | [Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Anthropic | Free | 25 min | Principles section: namespacing, meaningful context, token-efficient responses, tool descriptions | Your tool design. Day 5. |
| R8 | [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Anthropic | Free | 25 min | Whole post | Tool-output compaction and budgets. Day 10. |
| R9 | [Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) | Anthropic | Free | 20 min | First half (RAG primer, why BM25 + embeddings) on Day 6; second half (results, reranking) on Day 17 | Measured evidence that hybrid beats embeddings alone; tells you what to test. |
| R10 | [pgvector README](https://github.com/pgvector/pgvector) and [hybrid\_search\_rrf.py](https://github.com/pgvector/pgvector-python/blob/master/examples/hybrid_search_rrf.py) | pgvector project | Free | 30 min | README: Getting started, HNSW, Filtering, Hybrid search; the RRF example | Your retrieval store. Days 6, 17. |
| R11 | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Anthropic | Free | 25 min | Components of evals and grader types (Day 3); non-determinism, pass@k vs pass^k (Days 13, 15) | Vocabulary interviewers use: tasks, trials, graders, transcripts. |
| R12 | [*AI Engineering*](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) (O'Reilly, 2025) | Chip Huyen | **Paid.** US list $79.99; Kindle about $54; India: full-colour Shroff edition listed at ₹2,250 by one online seller. Prices vary. | 532 pages; use about 8 h | Ch. 2 (sampling, structured outputs), Ch. 3–4 (evaluation), Ch. 6 (RAG and agents), Ch. 7 first section (when to fine-tune), Ch. 9 (inference optimisation) | The one book that ties the whole field together at a senior level. Worth the money if you will reread it while interviewing. |
| R13 | [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) and [AI Evals FAQ](https://hamel.dev/blog/posts/evals-faq/) | Hamel Husain, Shreya Shankar | Free | 40 min + 1 h | The post in full (Day 3); FAQ entries on minimum viable eval setup, trusting automated evals, judge–human disagreement, synthetic data (Days 9, 15, 16) | The most practical eval method available free. |
| R14 | [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Yan, Bischof, Frye, Husain, Liu, Shankar | Free | 1.5 h | Tactical: RAG and evals sections (Day 8); Strategic: fine-tuning advice (Day 19) | Practitioner lessons; good interview ammunition. |
| R15 | [LangGraph Essentials (Python)](https://academy.langchain.com/courses/langgraph-essentials-python) | LangChain Academy | Free | 1 h video, 13 lessons | Lessons 1–5: nodes, edges, conditional edges, memory, interrupt / human in the loop | Exactly the features you use. The longer [Introduction to LangGraph](https://academy.langchain.com/courses/intro-to-langgraph) (free, about 4 h video) is optional. Day 11. |
| R16 | [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Simon Willison | Free | 15 min | Whole post | The clearest model of when injection becomes dangerous. Day 20. |
| R17 | [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) | OWASP GenAI Security Project | Free | 45 min used | LLM01 Prompt Injection, LLM06 Excessive Agency (Day 12), LLM08 Vector and Embedding Weaknesses, LLM10 Unbounded Consumption (Day 20) | Shared security vocabulary; maps to your defences. |
| R18 | OpenTelemetry [GenAI client spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) and [agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) | OpenTelemetry | Free | 30 min | Inference span attributes; invoke\_agent and tool spans | Your tracing. Status is still "Development", so attribute names can change. Day 21. |

**Not recommended for this plan:** DeepLearning.AI *Retrieval Augmented Generation* (good, but about 26 hours and mostly overlaps R9–R10), Maven *AI Evals For Engineers & PMs* (price unverified, cohort timing), Karpathy's *Let's build the GPT Tokenizer* (excellent but 2 hours on a topic you need only conceptually), and any "build an agent in 10 minutes" tutorial.

## D. 30-day execution plan

172 planned hours: 26 days of 6 hours, two light review days of 3 hours (Days 7, 21) and two 5-hour buffer days (Days 14, 25). Day 1 is Thursday 12 November; Day 30 is Friday 11 December. "Hrs" shows total / learning hours. Resource IDs link to section C. A day is complete only when its "Done when" column is true.

**Fixed daily rules:** start each day by explaining yesterday's work aloud for 5 minutes without notes; Claude Code may scaffold and write tests, but you write the agent loop, scorers, label schema, verifier and RRF yourself; end each day with the log entry (I wrote / Claude wrote / can explain / unclear / spend).

| Day | Hrs | Concept | Resource → exact part | Build → deliverable | Done when | Exercise or interview question |
| --- | --- | --- | --- | --- | --- | --- |
| **Week 1: foundations, data and baseline before the agent** |  |  |  |  |  |  |
| 1 | 6 / 2 | Tokens, next-token sampling, context window, pretraining vs post-training | R1 00:00–21:05; R2 Ch. 5; R5 Messages API page | Repo scaffold (Claude Code); spend limit; LLMClient protocol and cost logic written by you; Anthropic + fake clients | Fake-client and cost tests pass; 20-call temperature experiment logged | Why can output vary at temperature 0? |
| 2 | 6 / 2 | Attention; tool-use protocol; structured outputs | R2 Ch. 6; R4 Tool use lessons 1–4; R5 Tool use + Structured outputs pages | Pydantic → tool schema helper; forced-tool extraction with one repair retry; retry/backoff/timeout wrapper | 15 mocked malformed-output tests; live parse-success rate on 30 calls | Tool calling vs JSON in the prompt vs constrained decoding: when each? |
| 3 | 6 / 1.5 | Evaluation-first development; ground truth; grader types | R13 "Your AI Product Needs Evals"; R11 components and graders sections | **AI-free:** scenario and label schema (root cause enum, required evidence, forbidden actions, category); 4 hand-written scenarios; ADR-001 | Schema validation tests; written label checklist | Why enums instead of free-text root causes? What do you lose? |
| 4 | 6 / 1 | Workflows vs agents; what a strong baseline is | R6 whole post | 4 typed read-only tools with evidence IDs; **AI-free:** rule-based correlator baseline and deterministic scorer | Tool tests pass; baseline scored on 4 scenarios | Where must your baseline fail, by design? |
| 5 | 6 / 1.5 | Agent loop mechanics; tool design | R6 "Agents" section; R7 principles section | **You write** the loop: step/token/time budgets, tool errors as error results, transcript storage; eval CLI v0 (JSON results) | Mocked tests: termination, unknown tool, exception, budget; first live agent-vs-baseline run on 4 scenarios | What happens if the model loops or invents a tool? |
| 6 | 6 / 1.5 | Embeddings, cosine similarity, BM25, HNSW | R9 first half; R10 README sections | 20 synthetic runbooks and incidents (LLM-drafted, you edit and mark as generated); chunking; fastembed; pgvector + tsvector; search\_docs tool | 25 labelled queries; Recall@5 and MRR for BM25 vs vector recorded | Why might BM25 beat embeddings on error codes? |
| 7 | 3 / 1 | Review | 10-question recall quiz from me | **AI-free:** add get\_config\_changes tool and a scenario needing it | Week 1 gate (section E) | Explain your loop line by line without notes |
| **Week 2: the real system and the dataset** |  |  |  |  |  |  |
| 8 | 6 / 1 | Grounding and hallucination as a measurable event | R14 Tactical: RAG and evals parts | Report schema with evidence IDs; **you write** the citation verifier; single-shot RAG baseline | Verifier tests incl. fabricated IDs; 3 systems on 4 scenarios | How do you measure hallucination in this system? |
| 9 | 6 / 1 | Synthetic data without leakage | R13 FAQ synthetic-data entries | **Dataset sprint 1:** templated generator; 16 dev scenarios across 5 categories; label audit | Baseline and agent scored on 16; failure list started | How do you stop generator patterns making the task trivial? |
| 10 | 6 / 1 | Context engineering; prompt caching | R8 whole post; R5 Prompt caching page | Compact tool outputs that keep evidence IDs; caching on system prompt and tools; prompt version IDs | Tokens and cost per run before vs after; accuracy unchanged within noise | What do you lose when you truncate logs, and how would you detect it? |
| 11 | 6 / 2 | Graphs, state, checkpoints, interrupts | R15 lessons 1–5 | Port to LangGraph with Postgres checkpointer; interrupt before remediation | 6-scenario smoke parity; kill-and-resume test passes | What did LangGraph give you, and what did it cost? |
| 12 | 6 / 1 | Least privilege; excessive agency; idempotency | R17 LLM06 | propose\_remediation → approve/reject API → simulated executor with idempotency key; audit table; role check | Tests: no execution without approval, duplicate approval idempotent, wrong role denied | The model proposes restarting the primary DB at 3 a.m. Walk me through it. |
| 13 | 6 / 1 | Abstention; non-determinism; pass@k vs pass^k | R11 non-determinism section | **Dataset sprint 2:** 24 dev scenarios; write 12 held-out and seal them (commit a hash); abstain outcome and hypothesis tracking | False-confident rate measured; held-out sealed | How do you make a model reliably say "I don't know"? |
| 14 | 5 / 1 | Buffer | — | Catch up first. Otherwise: HTMX page and CI integration test. **Debugging exercise:** find a planted failure from transcripts only. **Mock 1** (30 min, fundamentals and RAG). Update LinkedIn headline. | Week 2 gate | Explain checkpoint and resume semantics |
| **Week 3: evaluation, security, production** |  |  |  |  |  |  |
| 15 | 6 / 2 | Eval rigour: repeats, intervals, regression evals | R11 remainder; R13 FAQ "trust my automated eval"; R12 Ch. 3–4 if bought | Eval CLI v1: 3 repeats, rate-limited concurrency, record/replay cache; all section A metrics; bootstrap intervals | Full dev run recorded in EVALUATION.md | With 24 scenarios, how large a difference is real? |
| 16 | 6 / 1 | LLM-as-judge done properly; error analysis | R13 FAQ judge–human disagreement entry | Hand-grade 30 explanations; build and validate a judge for explanation quality; open-code every failure into a taxonomy | Judge agreement (TPR, TNR) recorded; taxonomy table | Why not use the judge for root-cause accuracy? |
| 17 | 6 / 1 | Hybrid retrieval; fixing by evidence | R9 second half; R10 RRF example | **You write** RRF; fix the top 2 failure causes; keep hybrid only if it helps | Before/after tied to prompt versions; ADR on hybrid | Hybrid raised Recall@5 but not accuracy. What do you conclude? |
| 18 | 6 / 0.5 | Model selection on quality, latency, cost | R5 Pricing page | Haiku 5.5 vs Sonnet 5.5 on dev; cost per correct investigation; resume v1; 3 applications | Model-choice ADR; applications sent | When is a 20× more expensive model worth it? |
| 19 | 6 / 2 | Inference: prefill vs decode, KV cache, why output dominates latency; fine-tuning vs RAG | R12 Ch. 9 + Ch. 7 first section, or R3 selected chapters; R14 Strategic | Latency breakdown per call; caching effect on latency; ADR "why we do not fine-tune" | Latency table in EVALUATION.md | Why does output length dominate latency? When would you fine-tune here? |
| 20 | 6 / 1.5 | Direct and indirect prompt injection | R16; R17 LLM01, LLM08, LLM10 | 8 adversarial scenarios; phase-scoped tools, untrusted-content marking, model-independent approval | Attack success and unsafe-action rate before and after | Why can't a better system prompt fix injection? |
| 21 | 3 / 1 | LLM tracing | R18 inference and agent spans | OTel spans per model and tool call; Jaeger in Compose | Trace screenshot in docs; Week 3 gate | A user says yesterday's answer was wrong. Debug that single run. |
| **Week 4: proof, delivery, career** |  |  |  |  |  |  |
| 22 | 6 / 0.5 | Honest reporting | — | **First and only held-out run**; CI regression gate on replayed responses; 20% tool-failure injection run. **Mock 2:** eval design and debugging | Results recorded as they are | Your eval says 85%. Why might production be worse? |
| 23 | 6 / 0.5 | Deployment hardening | R17 LLM10 recap | VPS deploy; secrets; spend cap; replay demo; password-gated live mode; 4 applications | Public URL works; cap tested | How do you stop a public demo draining your API budget? |
| 24 | 6 / 0.5 | Writing for reviewers | — | README with architecture diagram and results table; final EVALUATION.md; case-study draft | Fresh clone runs in under 15 minutes | Give the 90-second pitch |
| 25 | 5 / 0 | Buffer | — | Catch up first. Otherwise: demo video (3–5 min); record the pitch | Video published | — |
| 26 | 6 / 1 | AI system design interviews | R6 and R12 Ch. 6 review | Resume v2 and LinkedIn with real numbers; **Mock 3:** design a RAG assistant with tenant isolation; 5 applications | Critique written | Design retrieval for 10M documents across tenants |
| 27 | 6 / 0.5 | Independent capability | — | **AI-free, 3 hours:** deploy-diff tool + 2 scenarios + eval; then rehearse the 5-minute architecture talk | Feature works and is evaluated | Explain every line you wrote today |
| 28 | 6 / 1 | Live coding with an LLM API | R4 Tool use lesson 4 as warm-up | **Mock 4:** build a tool-calling loop from scratch in 45 minutes without Claude; project defence | Critique; gaps listed | Live: add a tool and a test |
| 29 | 6 / 1 | Full interview loop | Your own INTERVIEW\_PREP.md | **Mock 5:** full loop. P2 work (MCP server) only if every P0 and P1 is done | Critique | "You have no production AI experience." Respond. |
| 30 | 6 / 0.5 | Readiness review | The 14 postings in the V1 plan | Score yourself against postings; 60-day plan; at least 15 applications sent in total | Acceptance criteria (section H) checked | What would you build next, and why? |

## E–F. Weekly milestones and priorities

| Gate | Demonstrable outcome | You explain without notes | If behind, cut |
| --- | --- | --- | --- |
| Day 7 | Live agent, hand-written loop, 4 read-only tools and retrieval, scored against the rule baseline on 4+ scenarios; Recall@5 for BM25 vs vector | The tool-use message exchange; why the loop stops; Recall@5 vs MRR | Second baseline moves to Day 8 |
| Day 14 | 24 dev + 12 sealed held-out scenarios; cited reports with a verifier; LangGraph with checkpointed approval; approval tests passing | How approval is enforced outside the model; checkpoint/resume; abstention logic | UI (use the API docs page); prompt caching |
| Day 21 | Full dev evaluation with intervals; validated judge; failure taxonomy; adversarial results; model choice backed by data; tracing | Every metric's definition; top 3 failure modes; the limits of your injection defences | Hybrid search; tracing (keep logs) |
| Day 30 | Held-out results, deployed demo or video, README, case study, resume, 5 mocks, 15+ applications | The 5-minute architecture talk; any trade-off in section A | Live public mode (replay only) |

**P0: mandatory**

- Hand-written loop, then LangGraph, with step, token and time limits
- Typed read-only tools with evidence IDs; retrieval over runbooks and incidents
- Structured report, deterministic citation verifier, abstention outcome
- Approval gate enforced in code, with tests
- 36 labelled scenarios (24 dev, 12 held-out) plus 8 adversarial
- Rule baseline and single-shot RAG baseline; 3 repeats; cost and latency
- Eval CLI with replay cache; CI with tests and replayed regression eval
- README, EVALUATION.md, ADRs

**P1: valuable**

- Hybrid search with RRF (kept only if it helps)
- Validated LLM judge for explanation quality
- Prompt caching measured; Haiku vs Sonnet comparison
- OpenTelemetry GenAI tracing
- Public deployment with replay mode; demo video

**P2: optional**

- MCP server exposing the tools
- Second provider; reranker; Langfuse; Voyage embedding comparison; model escalation routing

## G–H. Career readiness and Day 30 acceptance criteria

**Career work spread across the month**

| Day | Career deliverable |
| --- | --- |
| 1 | Public GitHub repo with a one-paragraph README stating the goal and that the project is in progress |
| 7, 14, 21 | A short dated progress note in the README (what works, what was measured) |
| 14 | LinkedIn headline, e.g. "Senior Backend Engineer, Python and distributed systems, building evaluated LLM agent systems" |
| 18 | Resume v1: project section with placeholders for numbers you have not measured yet; first 3 applications |
| 22–24 | Real numbers enter the resume; case study drafted |
| 25 | Demo video and recorded 90-second pitch |
| 26 | Resume v2 and LinkedIn "About" with measured results |
| 14, 22, 26, 28, 29 | Five mock interviews: fundamentals, eval design and debugging, system design, live coding without Claude, full loop |
| 30 | At least 15 applications, prioritising Senior Backend Engineer roles on AI products and AI platform roles |

**Truthful positioning.** The project goes under "Projects", not under employment. Example bullet form: "Built IncidentOps, an LLM incident-investigation agent (Python, FastAPI, LangGraph, pgvector); evaluated on 36 synthetic scenarios against a rule-based baseline: \[measured result\]; 0 unapproved actions across \[n\] adversarial runs." Never write "deployed to production" or imply customers. Your 5 years of distributed systems, OpenTelemetry and DAG orchestration stay the headline.

**Acceptance criteria for Day 30**

Working

- [ ] An investigation runs end to end from the API and the web page, live or in replay mode
- [ ] Approval gate blocks every unapproved action; tests prove it
- [ ] A fresh clone runs locally with Docker Compose in under 15 minutes
- [ ] CI passes: unit tests, integration test with the fake provider, replayed regression eval

Measured (in EVALUATION.md, with dates and prompt/model versions)

- [ ] Agent vs both baselines on dev and held-out sets, by scenario category, with intervals and pass^3
- [ ] Retrieval Recall@5 and MRR for each retrieval variant tried
- [ ] Citation precision, invalid tool-call rate, false-confident rate, unsafe-action rate, attack success rate
- [ ] Cost and p50/p95 latency per investigation for each model tried; total API spend for the month
- [ ] Judge–human agreement for the explanation judge

Documented

- [ ] README with architecture diagram, results table and known limitations
- [ ] At least 6 ADRs (dataset design, loop vs framework, retrieval, model choice, no fine-tuning, security model)
- [ ] Case study, demo video, resume, LinkedIn

Understood without assistance

- [ ] Rebuild a tool-calling loop from scratch in 45 minutes without Claude
- [ ] Explain attention, sampling, prefill vs decode and why output tokens dominate latency
- [ ] Defend every metric, including the ones where the agent lost
- [ ] Explain how you would scale it: queueing investigations, tenant isolation, rate limits, cost controls

## Final professional judgment

**Yes, you would be a credible candidate for Applied AI Engineering interviews, but not for every Applied AI role.** You would pass the screens and technical rounds of roles that want a strong backend engineer who can build and evaluate LLM systems. You would still be screened out by roles that hard-require 2+ years of production LLM experience, and nothing in 30 days changes that.

**Skills you would genuinely have**

- Building tool-calling agents with explicit budgets, error handling, durable state and human approval
- Designing an evaluation from scratch: labelled data, baselines, deterministic graders, a validated judge, repeats and intervals
- Retrieval engineering with measured trade-offs between keyword, vector and hybrid search
- Practical prompt-injection defence based on architecture rather than prompts
- Reasoning about cost and latency in tokens, and choosing a model from data

**Evidence the portfolio would show:** a public repo with tests and CI, an evaluation report with honest held-out numbers (including where the agent loses), ADRs for every major decision, a demo, and recorded interview practice. That is more evaluation rigour than most AI portfolio projects show.

**Gaps that would remain**

- No production traffic: no real users, real drift, or on-call experience with an AI system
- Synthetic data: results show method, not real-world accuracy
- Model internals are conceptual only; no training, fine-tuning or GPU serving
- One provider and one framework in depth

**Most realistic roles to target**

1. Senior Backend Engineer on an AI product team (agents, RAG, platform). Your strongest fit.
2. AI Platform Engineer roles centred on orchestration, observability and evaluation infrastructure, not GPU serving.
3. Applied AI / LLM Engineer roles that list 0–2 years of LLM experience or none.

Apply selectively to roles requiring 3+ years of production LLM work; expect a lower hit rate there.

**Does the project meet senior expectations?** Yes, if the evaluation is real. A senior interviewer will spend most of the time on three questions: how do you know it works, what happens when it fails, and why did you build it this way. The project is designed to answer all three. It falls short of senior expectations only if the dataset is easy, the numbers are not reproducible, or you cannot explain code you did not write.

**What to study in the 60 days after**

1. Production signals: run the agent against a real open-source system you break deliberately (for example the OpenTelemetry demo application) to reduce reliance on synthetic data.
2. A second provider and an open-weight model, to compare behaviour and cost.
3. Inference serving basics with vLLM on a rented GPU, enough to discuss throughput and batching from experience.
4. Fine-tuning a small model for one narrow sub-task (such as log classification) and comparing it against prompting, as an honest experiment.
5. Contributing a fix or eval to an open-source agent or eval tool, which gives you external, verifiable AI engineering work.
