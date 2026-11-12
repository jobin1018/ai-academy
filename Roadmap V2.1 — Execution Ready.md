# Roadmap V2.1 — Execution Ready

Nov 11, 2026 · @Job

This document is the execution baseline. It supersedes Roadmap V2 only where it says so; every section of V2 not changed here stays in force.

## 1. Correction report

Seven corrections. The most important is the API one: V2's Day 1 experiment and Day 2 design would both have failed on the current models. Total hours move from 172 to 179, inside the 160–180 budget.

| # | Problem in V2 | Correction in V2.1 | Evidence |
| --- | --- | --- | --- |
| 1 | Day 1 experiment varied temperature on Haiku 5.5. Haiku 5.5 rejects any temperature other than 1, and any top\_p or top\_k. | New Day 1 experiment: output variance and cost across effort levels and thinking on/off, token counts across log formats, and a deliberate 400 to test your error path. | [Haiku 5.5 migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide) |
| 2 | Day 2 relied on forced tool calling for structured extraction. Sonnet 5.5 rejects tool\_choice "any" and "tool" with a 400. Haiku 5.5 still accepts it. | Structured outputs (output\_config.format) for the report; tool\_choice "auto" with strict tools in the agent loop; never forced tool use. The same code then works on both models. | [What's new in Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5), [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) |
| 3 | V2 ignored thinking. Both models think adaptively by default; thinking tokens count toward max\_tokens and are billed as output; thinking blocks must be passed back unmodified in tool loops. | Client parses content blocks by type, preserves thinking blocks, sets effort explicitly, leaves max\_tokens headroom, records thinking tokens in cost logs. | [What's new in Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5), [Opus 5.5 migration guide](https://platform.claude.com/docs/models/opus-5-5/migration-guide) |
| 4 | Several days overloaded, worst on Day 6 (documents, labelled queries, retrieval and benchmark). Also Days 4, 13, 15–17. | Work redistributed across Days 3–7, 13–14 and 15–21; buffer days converted to planned 6-hour days; P1 items named as the cut list instead. | Section 3 |
| 5 | Dataset was designed mostly to defeat the baseline, which biases the comparison. | Fixed category mix including easy and insufficient-evidence cases; labels derived from the injected fault, written before any system runs; leakage rules. | Section 2 |
| 6 | "Bootstrap intervals" on 24 and 12 scenarios overstates precision; results risked being presented as general accuracy. | Wilson intervals for rates; paired, scenario-level comparison (sign test); counts not percentages for small categories; mandatory "synthetic, self-authored" wording. | Section 2 |
| 7 | Resource links incomplete: 3Blue1Brown linked to lesson pages, not videos; no timestamps; no outdated-resource flags; docs pointed at a site root. | Full index R1–R18 with exact video links, timestamps, exact docs pages, roadmap days and status flags. Four resources flagged as partly dated. | Section 4 |

**Unchanged:** the project, architecture, curriculum, career plan, P0/P1/P2 lists and acceptance criteria in V2, except where sections 2–3 below say otherwise.

## 2. Updated technical decisions

### 2.1 Model behaviour the code must respect

Verified against Anthropic's current docs on 11 Nov 2026. Where a cell cites a third-party summary, it is marked.

| Behaviour | Haiku 5.5 (`claude-haiku-5-5`) | Sonnet 5.5 (`claude-sonnet-5-5`) |
| --- | --- | --- |
| temperature, top\_p, top\_k | Omit. temperature, if sent, must be 1 | Omit |
| Thinking default | Adaptive, effort medium | Adaptive, effort high |
| Turning thinking off | `{"type": "disabled"}` allowed at effort high or below | "disabled" returns 400; `{"type": "between_tools"}` turns off up-front thinking at high or below |
| Forced tool use (tool\_choice "any" / "tool") | Accepted; the response then starts with the tool call and has no thinking block | 400 error |
| Structured outputs (`output_config.format`, `strict: true` tools) | Supported on the Claude API | Supported on the Claude API |
| Assistant prefill | Rejected | Rejected |
| Tool-use loops | Pass thinking blocks back unmodified | Same |
| Other | About 30% more tokens than Haiku 4.5 for the same text; cache minimum 512 tokens | — |

Sources: [Haiku 5.5 migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide), [What's new in Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5), [Sonnet 5.5 migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide), [What's new in Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5), [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). The "forced tool use accepted on Haiku 5.5" row follows from the Thinking page's list of exceptions and is confirmed by third-party migration write-ups.

### 2.2 Decisions that follow (ADR-002, written on Day 2)

1. **The LLM client never sends sampling parameters.** A unit test asserts no request contains temperature, top\_p or top\_k.
2. **No forced tool use anywhere.** The agent loop uses `tool_choice: auto`, `strict: true` tools, and a system prompt that states when each tool applies. Code is identical for Haiku and Sonnet, which keeps the Day 18 model comparison fair.
3. **The final report is a separate call** with `output_config.format` and no tools. Anthropic's Haiku 5.5 prompting guide warns that combining JSON format with tools the model must call can suppress the tool call ([Prompting Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5)).
4. **Repair retry only for semantic errors.** Schema conformance is guaranteed by structured outputs; Pydantic still checks business rules (cited IDs exist, confidence sums, enum consistency). One bounded retry, then fail closed.
5. **Thinking is configured, not defaulted.** Adaptive thinking with an explicit effort per call type (start: medium for the agent, low for the report); max\_tokens sized with headroom; thinking tokens logged as cost. Effort level becomes a measured variable on Day 18.
6. **Content blocks parsed by type**; thinking blocks stored and replayed unmodified in the transcript.
7. **Framework caution:** if you later use LangChain wrappers, check that structured-output helpers do not use forced tool calling under the hood, or they will fail on Sonnet 5.5. V2.1 uses the Anthropic SDK directly inside LangGraph nodes.

### 2.3 Dataset design (replaces V2 dataset rules)

**Fixed mix across the 36 main scenarios** (plus the 8 adversarial scenarios, scored separately):

| Category | Share | Count (dev / held-out) | What it tests | Correct outcome |
| --- | --- | --- | --- | --- |
| Straightforward | about 35% | 8 / 4 | One clear fault, consistent signals. The baseline should often get these right; that is fine. | Diagnose |
| Difficult | about 30% | 7 / 4 | Multi-hop causes, red herrings, cause explained only by a runbook or past incident | Diagnose |
| Ambiguous | about 20% | 5 / 2 | Two plausible causes; evidence favours one weakly | Primary cause, with listed acceptable alternates |
| Insufficient evidence | about 15% | 4 / 2 | Key telemetry missing | Abstain |

**Ground-truth rules**

- A fault taxonomy (about 10 fault types, such as connection-pool exhaustion, bad deploy, downstream timeout, consumer lag, config change, disk pressure) is written and frozen on Day 3 before any scenario.
- Each scenario is generated from a **fault specification** (injected fault, service, time, signals to emit). The label is derived from that specification, not from any model's output, and is committed before any system runs on it.
- Labels: primary root cause (service + fault type), acceptable alternates (ambiguous only), required evidence IDs, forbidden actions, expected outcome (diagnose or abstain).
- **Blind consistency check:** a fresh Claude session with only the fixtures (no labels, no spec) names the root cause for every dev scenario. Every disagreement is reviewed by you and either the label or the scenario is fixed. This checks label consistency; it is not an independent human labeller, and the README says so.

**Leakage rules**

- Held-out scenarios are generated from separate fault specifications with different random seeds, services and surface wording; at least 3 held-out scenarios use fault–service combinations absent from dev.
- Runbooks and past incidents describe fault types generally; none may describe a specific held-out scenario.
- Prompt changes, tool changes and few-shot examples come only from dev failures. Held-out transcripts are never read before the Day 22 run.
- Held-out files are committed with a SHA-256 hash on Day 14 and not opened afterwards except by the eval runner.
- If anything changes after the held-out run, any re-run is reported as "held-out (seen)" and cannot replace the first result.

### 2.4 Benchmark validity (replaces V2 statistics)

- Report rates as k/n with **Wilson 95% intervals**. With n = 12, an observed 10/12 has an interval of roughly 55–95%; say so plainly.
- Compare systems **pairwise on the same scenarios**: count scenarios where the agent is right and the baseline wrong, and vice versa, and apply an exact sign (McNemar) test. Use the majority outcome over 3 runs per scenario.
- Report pass^3 (correct on all 3 runs) next to the mean, because consistency matters in incidents.
- For categories with fewer than 10 scenarios, report counts, not percentages.
- Required wording in README and resume: "on 36 synthetic incident scenarios I authored". No claim of real-world accuracy, no "X% better" without its interval.
- Dev and held-out results always appear in separate tables.

### 2.5 Dependencies and environment

Versions are pinned in `uv.lock` on Day 1 and recorded in ADR-002; this plan does not guess version numbers.

| Need | Package or image | Day | Check |
| --- | --- | --- | --- |
| Runtime | Python 3.12, uv | 1 | `uv run python -V` |
| Database | Docker image `pgvector/pgvector` (PostgreSQL with the extension) | 1 | `CREATE EXTENSION vector;` succeeds |
| LLM API | `anthropic` (latest release at install) | 1 | Smoke tests below pass on both models |
| API, schemas | fastapi, pydantic v2, uvicorn | 1 | — |
| DB driver | psycopg 3 (`psycopg[binary]`) | 4 | Loader test |
| Embeddings | fastembed with `BAAI/bge-small-en-v1.5` (downloads the model on first use) | 6 | Embeds a sentence offline after first download |
| Orchestration | langgraph, langgraph-checkpoint-postgres | 11 | Interrupt-and-resume test |
| Tests | pytest, pytest-asyncio | 1 | — |
| Tracing | opentelemetry-sdk, OTLP exporter; Jaeger container | 21 | Spans visible in Jaeger |

**API smoke tests (Day 1, about $0.01 total):** one Haiku 5.5 call; one Sonnet 5.5 call with a strict tool and `tool_choice: auto`; one structured-output call; one Haiku call with `temperature: 0` that must return 400 and be classified by your client as a non-retryable client error; one token-count call.

## 3. Updated schedule (changed days only)

17 of 30 days change; the other 13 stay exactly as in V2 section D. New total: **179 hours** (29 days of 6 hours plus Day 7 at 5 hours; the former buffer days are now planned work). The cut list replaces buffer days: if a gate slips, drop P1 items in this order: LLM judge, tracing, hybrid search, live public mode.

| Day | Hrs (total / learn) | What changed | Build → deliverable | Done when | Exercise or question |
| --- | --- | --- | --- | --- | --- |
| 1 | 6 / 2 | Temperature experiment replaced; API smoke tests added | Scaffold; LLMClient (you write it) that never sends sampling params and parses blocks by type; smoke tests from section 2.5; experiment in section 6 | Smoke tests pass on both models; experiment results logged | Why can two identical requests give different answers when you cannot set temperature? |
| 2 | 6 / 2 | Forced tool use replaced with structured outputs and strict tools | Pydantic → JSON schema helper; report call via `output_config.format`; strict tool definitions with `tool_choice: auto`; semantic validator with one retry; retry/backoff/timeout wrapper; ADR-002 | 15 mocked tests (semantic failures, 400 vs 429 vs 529 handling); live structured-output success on 20 calls per model | Why does Sonnet 5.5 reject forced tool use, and what do you lose without it? |
| 3 | 6 / 1.5 | Fault taxonomy and scorer added; scenario count unchanged | **AI-free:** fault taxonomy (frozen), fault-spec format, label schema, deterministic scorer; 4 hand-written scenarios (2 straightforward, 1 difficult, 1 insufficient-evidence) | Schema and scorer tests pass | Why derive labels from the fault spec instead of from a model's answer? |
| 4 | 6 / 1 | Scorer moved out; loader added | Fixture loader and DB schema (Claude Code may scaffold); 4 typed read-only tools with evidence IDs; **AI-free:** rule-based baseline | Tool tests; baseline scored on the 4 scenarios | Which of your 4 scenarios should the baseline get right? Did it? |
| 6 | 6 / 1.5 | Halved | 12 synthetic documents (8 runbooks, 4 past incidents; LLM-drafted, you edit, marked generated); chunking; embeddings; pgvector + tsvector tables; search\_docs tool; 10 smoke queries | Search tool returns sensible top-5 for the 10 smoke queries | Why might BM25 beat embeddings on error codes? |
| 7 | 5 / 1 | Retrieval benchmark moved here from Day 6 | Label 15 more queries (25 total, written before looking at results); Recall@5 and MRR for BM25 vs vector; **AI-free:** get\_config\_changes tool + scenario; recall quiz | Week 1 gate (section 5) | Explain your loop and your Recall@5 number without notes |
| 9 | 6 / 1 | Smaller target; category mix enforced | Fault-spec generator; dev set to 14 using the section 2.3 mix; document corpus to 16 as scenarios need; blind consistency check on all dev scenarios | Disagreements resolved and logged | Your baseline got every straightforward case right. Is that a problem? |
| 12 | 6 / 1 | CI integration test moved here from Day 14 | Approval API, simulated executor, audit table, role check; end-to-end CI test with the fake provider | Approval tests and CI green | The model proposes restarting the primary DB at 3 a.m. Walk me through it. |
| 13 | 6 / 1 | Held-out authoring moved to Day 14 | Abstain outcome and hypothesis tracking; dev set to 24 (10 new, mix enforced); corpus to about 20 | False-confident rate measured on dev | How do you make a model reliably say "I don't know"? |
| 14 | 6 / 0.5 | Buffer replaced by planned work | 12 held-out scenarios from separate fault specs and seeds; labels committed; SHA-256 hash committed; **Mock 1** (30 min); LinkedIn headline; Week 2 gate review | Held-out sealed; gate passed | Explain checkpoint and resume semantics |
| 15 | 6 / 2 | Statistics moved to Day 16 | Eval CLI v1: 3 repeats, rate-limited concurrency, record/replay cache, all metrics | Full dev run recorded | Why record and replay model responses in CI? |
| 16 | 6 / 1 | Error analysis and debugging exercise moved here | **You write** Wilson intervals and the paired sign test; open-code every dev failure into a taxonomy; **debugging exercise** from transcripts only | Results table with intervals; taxonomy | With 24 scenarios, how large a difference is real? |
| 17 | 6 / 1 | Judge moved to Day 21 | Fix top 2 failure causes (dev only); re-run; **you write** RRF; retrieval-only comparison on the 25 queries, then end-to-end only if retrieval improves | Before/after tied to prompt versions; hybrid ADR | Hybrid raised Recall@5 but not accuracy. What do you conclude? |
| 18 | 6 / 0.5 | Effort level added as a variable | Haiku 5.5 vs Sonnet 5.5, each at two effort levels, same code path; cost per correct investigation; resume v1; 3 applications | Model and effort ADR | When is a 20× more expensive model worth it? |
| 21 | 6 / 1 | LLM judge moved here; day extended | Hand-grade 30 explanations; build and validate the explanation judge (agreement); OTel tracing; Week 3 gate review | Judge agreement and trace screenshot recorded | A user says yesterday's answer was wrong. Debug that single run. |
| 22 | 6 / 0.5 | Statistics rules applied | Held-out run once; report with Wilson intervals and paired test, separate from dev; CI replay gate; failure injection; **Mock 2** | Results recorded as they are, with the required wording | Your eval says 85%. Why might production be worse? |
| 25 | 6 / 0 | Buffer replaced by planned work | HTMX page (moved from Day 14); demo video; recorded 90-second pitch | Video published | — |

**Unchanged days:** 5, 8, 10, 11, 19, 20, 23, 24, 26, 27, 28, 29, 30. One note for Day 11: call the Anthropic SDK directly inside LangGraph nodes rather than through LangChain chat-model wrappers (section 2.2, point 7).

## 4. Learning-resource index (R1–R18)

Every link below was found through search on 11 Nov 2026 and points to the exact video, page or repository. Timestamped links open at the right moment. Status: **Current**, **Partly dated** (use with the stated caveat) or **Replaced** (use the replacement).

| ID | Resource and exact link | Cost | Length | Use exactly | Days | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Andrej Karpathy, [1hr Talk: Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g) | Free | 60 min | 0:00–21:05 (inference, training, fine-tuning into an assistant); then [security part from 45:43](https://www.youtube.com/watch?v=zjkBMFhNj_g&t=2743s) to the end | 1 | Current for concepts; model names are from 2023 |
| R2a | 3Blue1Brown, [Transformers, the tech behind LLMs (Ch. 5)](https://www.youtube.com/watch?v=wjZofJX0v4M) · [lesson page](https://www.3blue1brown.com/lessons/gpt) | Free | 27 min | Whole video | 1 | Current |
| R2b | 3Blue1Brown, [Attention in transformers, step-by-step (Ch. 6)](https://www.youtube.com/watch?v=eMlx5fFNoYc) · [lesson page](https://www.3blue1brown.com/lessons/attention) | Free | 26 min | Whole video | 2 | Current |
| R3 | Andrej Karpathy, [Deep Dive into LLMs like ChatGPT](https://www.youtube.com/watch?v=7xTGNNLPyMI) | Free | 3 h 31 min | [Tokenization → inference, 7:47–31:09](https://www.youtube.com/watch?v=7xTGNNLPyMI&t=467s); [Hallucinations, tool use, working memory, 1:20:32–1:41:46](https://www.youtube.com/watch?v=7xTGNNLPyMI&t=4832s); [Models need tokens to think, from 1:46:56](https://www.youtube.com/watch?v=7xTGNNLPyMI&t=6416s) to the next chapter marker. About 65 min in total. | 19 (if not using R12) | Current for concepts |
| R4 | **Replacement:** Anthropic, [Tutorial: Build a tool-using agent](https://platform.claude.com/docs/en/agents-and-tools/tool-use/build-a-tool-using-agent) | Free | About 45 min | Whole tutorial, typed by hand against Haiku 5.5 | 2 | Current |
| R4-old | Anthropic, [anthropics/courses](https://github.com/anthropics/courses) (Tool use course) | Free | — | Optional reading only | — | **Replaced.** Written for Claude 3 Haiku; its "forcing JSON with tool use" lesson relies on forced tool\_choice, which Sonnet 5.5 rejects, and its examples set temperature, which Haiku 5.5 rejects |
| R5a | Anthropic docs, [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) and [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) | Free | 30 min | Overview: "How tool use works"; Define tools: tool\_choice options and strict tools | 1, 2 | Current |
| R5b | Anthropic docs, [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | Free | 20 min | JSON outputs (`output_config.format`), strict tool use, compatibility section | 2 | Current |
| R5c | Anthropic docs, [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) | Free | 20 min | Model table, "Thinking with tool use", "Response prefill and forced tool use" | 1, 2 | Current |
| R5d | Anthropic docs, [Haiku 5.5 migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide), [What's new in Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5), [Prompting Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5) | Free | 30 min | Remove sampling parameters; Configure thinking; Recount tokens; "Use adaptive thinking with JSON output and your own tools" | 1 | Current |
| R5e | Anthropic docs, [What's new in Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5) and [Sonnet 5.5 migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide) | Free | 20 min | Forced tool use not supported; between\_tools | 2, 18 | Current |
| R5f | Anthropic docs, [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | Free | 20 min | Automatic caching; how the prefix is cached; pricing multipliers | 10 | Current |
| R5g | Anthropic docs, [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) and [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) | Free | 15 min | Model prices incl. long-context tier; effort levels | 1, 18 | Current (URLs taken from citations in third-party write-ups; open them on Day 1 to confirm) |
| R6 | Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Free | 25 min | Whole post; reread "When (and when not) to use agents" | 4, 5 | **Partly dated:** the post itself notes the tooling landscape changed since Dec 2024. Patterns still valid; ignore framework references |
| R7 | Anthropic, [Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Free | 25 min | Principles: choosing tools, namespacing, meaningful context, token-efficient responses, descriptions | 5 | Current |
| R8 | Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Free | 25 min | Whole post | 10 | Current |
| R9 | Anthropic, [Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) | Free | 20 min | Day 6: RAG primer and BM25 vs embeddings; Day 17: results and reranking | 6, 17 | Current for method; its cookbook uses older models |
| R10 | [pgvector README](https://github.com/pgvector/pgvector) and [hybrid\_search\_rrf.py](https://github.com/pgvector/pgvector-python/blob/master/examples/hybrid_search_rrf.py) | Free | 30 min | README: Getting started, HNSW, Filtering, Hybrid search; the RRF example | 6, 17 | Current |
| R11 | Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Free | 25 min | Day 3: components of evals and grader types; Days 13, 15: non-determinism, pass@k vs pass^k | 3, 13, 15 | Current (Jan 2026) |
| R12 | Chip Huyen, [*AI Engineering*](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) (O'Reilly, 2025) | **Paid**: US list $79.99, Kindle about $54; India full-colour Shroff edition listed at ₹2,250 by one seller | About 8 h used | Ch. 2, Ch. 3–4, Ch. 6, Ch. 7 first section, Ch. 9 | 15, 19, 26 | Current for concepts; predates the 5.5 API details |
| R13 | Hamel Husain, [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/); Husain & Shankar, [AI Evals FAQ](https://hamel.dev/blog/posts/evals-faq/) | Free | 40 min + 1 h | Post in full; FAQ: [minimum viable eval setup](https://hamel.dev/blog/posts/evals-faq/whats-a-minimum-viable-evaluation-setup.html), trusting automated evals, judge–human disagreement, synthetic data | 3, 9, 15, 21 | Current (FAQ updated Sept 2026) |
| R14 | Yan, Bischof, Frye, Husain, Liu, Shankar, [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Free | 1.5 h | Tactical: RAG and evals (Day 8); Strategic: fine-tuning advice (Day 19) | 8, 19 | **Partly dated (2024):** its structured-output tool recommendations predate provider-native structured outputs; use R5b for that topic |
| R15 | LangChain Academy, [LangGraph Essentials (Python)](https://academy.langchain.com/courses/langgraph-essentials-python) | Free | 1 h video, 13 lessons | Lessons 1–5: nodes, edges, conditional edges, memory, interrupt / human in the loop | 11 | Current |
| R16 | Simon Willison, [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Free | 15 min | Whole post | 20 | Current |
| R17 | OWASP, [Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) | Free | 45 min used | LLM01, LLM06, LLM08, LLM10 | 12, 20, 23 | **Check for a newer edition:** OWASP's resource listing shows an "OWASP GenAI LLM Top 10 2026" item dated 28 Jun 2026. On Day 12, open the listing; if a 2026 edition is published, use it instead (not verified here) |
| R18 | OpenTelemetry, [GenAI client spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) and [agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) | Free | 30 min | Inference span attributes; invoke\_agent and tool spans | 21 | **Status "Development":** attribute names can change; record the version you follow |

**Removed from use:** R4-old (replaced by R4). Nothing else needed replacing; four items carry caveats as shown.

## 5. Week 1 execution checklist (Days 1–7, 41 hours)

Tick items as they happen. "AI-free" means no Claude or Claude Code for that item; tests and docs lookups are fine.

**Before Day 1 (tonight, 20 minutes)**

- [ ] Anthropic Console account; monthly spend limit set (suggest $40 for Week 1)
- [ ] API key stored in a password manager, not in a file you will commit
- [ ] Docker, Python 3.12 and uv installed; `docker run` of the pgvector image works
- [ ] Empty public GitHub repo `incidentops-ai` created

**Day 1: client and API reality**

- [ ] Repo scaffold, `.gitignore` covering `.env`, `uv.lock` committed
- [ ] LLMClient protocol, Anthropic and fake implementations, cost logging written by you
- [ ] Unit test: no request ever contains temperature, top\_p or top\_k
- [ ] Five API smoke tests pass (section 2.5)
- [ ] Day 1 experiment logged (section 6)

**Day 2: structured outputs and strict tools**

- [ ] Report via `output_config.format`; tools with `strict: true`, `tool_choice: auto`
- [ ] Semantic validator with one retry; errors classified (400 never retried; 429 and 529 retried with backoff)
- [ ] ADR-002 (model behaviour decisions) committed
- [ ] Structured-output success rate on 20 calls per model recorded

**Day 3: ground truth first (AI-free)**

- [ ] Fault taxonomy frozen
- [ ] Fault-spec format, label schema, deterministic scorer, with tests
- [ ] 4 scenarios: 2 straightforward, 1 difficult, 1 insufficient-evidence
- [ ] ADR-001 (dataset design and leakage rules) committed

**Day 4: tools and baseline**

- [ ] Fixture loader and Postgres schema
- [ ] 4 typed read-only tools returning evidence IDs, with tests
- [ ] Rule-based baseline (AI-free), scored on the 4 scenarios

**Day 5: your agent loop**

- [ ] Loop written by you: step, token and wall-clock budgets; tool errors returned to the model; thinking blocks preserved
- [ ] Mocked tests: normal stop, unknown tool, tool exception, budget exhausted
- [ ] Eval CLI v0; first live agent-vs-baseline run on 4 scenarios saved

**Day 6: retrieval build**

- [ ] 12 documents (marked as generated where drafted by an LLM)
- [ ] Chunking, embeddings, pgvector + tsvector, search\_docs tool
- [ ] 10 smoke queries return sensible results

**Day 7: retrieval benchmark and review (5 hours)**

- [ ] 15 more labelled queries, written before looking at results (25 total)
- [ ] Recall@5 and MRR for BM25 and vector recorded in EVALUATION.md
- [ ] AI-free: get\_config\_changes tool and a scenario that needs it
- [ ] Recall quiz taken; answers and gaps logged

**Week 1 gate (all must be true)**

- [ ] One scenario runs end to end on Haiku 5.5: tools, retrieval, structured report
- [ ] Agent and rule baseline scored on 5+ scenarios, results committed (dev only, no claims)
- [ ] Same code path runs on Sonnet 5.5 without errors (one scenario)
- [ ] You can explain, without notes: the tool-use message exchange, why the loop stops, why forced tool use is avoided, Recall@5 vs MRR
- [ ] API spend for the week logged
- [ ] LEARNING\_LOG.md separates "I wrote" from "Claude Code wrote" for every day

## 6. Day 1 schedule (Thursday 12 November, 6 hours)

Goal: a tested LLM client that respects the current API, plus one experiment that shows you how Haiku 5.5 actually behaves. Expected API spend: under $0.50.

| Time | Block | Do this |
| --- | --- | --- |
| 0:00–0:35 | Watch | R1 [0:00–21:05](https://www.youtube.com/watch?v=zjkBMFhNj_g), then [45:43 to the end](https://www.youtube.com/watch?v=zjkBMFhNj_g&t=2743s). Write 5 lines: what a model is, what inference does, why assistants differ from base models, what prompt injection is. |
| 0:35–1:05 | Watch | R2a [Transformers, Ch. 5](https://www.youtube.com/watch?v=wjZofJX0v4M). Write: what an embedding is, what the final softmax produces, why the context window is a limit. |
| 1:05–1:35 | Read | [Haiku 5.5 migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide) (sampling parameters, thinking, token recount) and [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) ("How tool use works"). Open [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) and record the Haiku 5.5 and Sonnet 5.5 rates in ADR-002 draft. |
| 1:35–2:05 | Design (AI-free) | In LEARNING\_LOG.md, write the LLMClient interface: request type, response type (content blocks by type, usage incl. output tokens, stop reason), how a tool call is represented, which errors are retryable. Paste it here for review before Block 5. |
| 2:05–3:35 | Build | Claude Code scaffolds only (prompt below). **You write** the client, cost calculation and error classification. |
| 3:35–4:35 | Experiment | See below. |
| 4:35–5:20 | Prove | Tests: fake client; cost calculation; no sampling params ever sent; 400 not retried, 429 and 529 retried with backoff; timeout. Run the five smoke tests (section 2.5). |
| 5:20–6:00 | Defend and log | Answer the three questions; commit; log entry; paste the summary here. |

**Prompt for Claude Code (Block 5)**

```
Read CLAUDE.md. Scaffold only: pyproject with uv (Python 3.12), ruff, mypy, pytest; docker-compose with the pgvector/pgvector image; package incidentops/ with llm/, tools/, agent/, evals/ and empty __init__ files; a FakeClient test double returning scripted responses. Do NOT implement the LLMClient protocol, cost calculation, retry logic or error classification. Add no other dependencies without asking.
```

**Day 1 experiment (replaces the temperature experiment)**

1. **Variance without sampling controls.** Give Haiku 5.5 one short incident description (10 log lines, two plausible causes) and ask for the most likely root cause in one sentence. Run it 10 times with `thinking: {"type": "disabled"}` and effort low, and 10 times with adaptive thinking at effort medium. Record per run: the cause named, output tokens, latency, cost. Count how often the named cause differs.
2. **Token formats.** Using the token-counting endpoint, count the same 200 log lines formatted as JSON objects, as compact text lines and as CSV. Record the ratio.
3. **Error path.** Send one Haiku 5.5 request with `temperature: 0`. Confirm it returns 400 and that your client classifies it as non-retryable.

Write down what surprised you. Expectation to test, not assume: thinking changes cost and latency more than it changes the answer on easy prompts.

**Day 1 questions (answer in writing, without Claude)**

1. You cannot set temperature on Haiku 5.5. Why can identical requests still give different answers, and what does that mean for how many times you run each eval scenario?
2. Your token experiment showed a ratio between JSON and compact logs. How should your tools format output, and what do you lose?
3. Which API errors should your client retry, which should it never retry, and why must a retry never repeat a tool's side effect?

**Done when**

- [ ] Five smoke tests pass on the real API
- [ ] All Block 7 tests pass
- [ ] Experiment table and surprises in LEARNING\_LOG.md
- [ ] Three answers written; commit pushed; spend recorded

This document is now the execution baseline. Changes from here on happen only through gate reviews (Days 7, 14, 21), not through new planning rounds.
