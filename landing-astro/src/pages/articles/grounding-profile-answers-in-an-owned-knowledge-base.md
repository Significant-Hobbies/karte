---
layout: ../../layouts/Article.astro
title: "Grounding Profile Answers in an Owned Knowledge Base"
description: "Learn how Karte grounds AI profile answers using an owned knowledge base with lexical retrieval, fallback mechanisms, and Cloudflare D1."
date: "2026-09-20"
author: "Sarthak Agrawal"
readingMinutes: 5
---

## The Problem with Raw LLMs for Profiles

When visitors engage with a public profile, they expect answers that reflect the creator's actual history, projects, and voice. A raw Large Language Model (LLM) lacks this specific, current context. If a visitor asks, "What did this creator build last year?" a generic model might hallucinate an answer, provide outdated information, or offer a vague, unhelpful response.

Furthermore, generative AI can be slow. Every second a visitor waits for an answer increases the chance they will abandon the page entirely. For an inbound assistant, speed is a feature, not just a metric.

Finally, relying solely on an LLM dilutes creator control. The creator should always be the authoritative source of truth for their public identity, not a statistical model's best guess.

## Karte's Approach to Profile Memory

To address these challenges, Karte relies on an explicitly managed set of `infoBlocks`. These are discrete pieces of owner-authored knowledge that form the foundation of each profile's memory. Instead of hoping a model knows the right answer, Karte forces the model to draw exclusively from these user-defined blocks.

This system is powered by a shared Cloudflare Worker designated as the `knowledgebase`. When a creator adds, updates, or deletes an `infoBlock` through their authenticated dashboard, the changes are synchronized with this worker via a dedicated service binding (`RAG_SERVICE`). This ensures that the profile memory is always current and directly reflects the creator's intentions.

## The Retrieval Mechanism: Speed Over Semantics

In many AI applications, Retrieval-Augmented Generation (RAG) relies heavily on semantic search—using vector embeddings to find conceptually related information. While powerful, generating embeddings and searching vector databases introduces significant latency.

For public profile chat, Karte takes a different approach, prioritizing speed and determinism. The retrieval process for `infoBlocks` is heavily optimized for fast, lexical lookups.

When a visitor asks a question, the chat endpoint queries the `knowledgebase` worker. However, this query is placed on a strict 150-millisecond timeout (`searchWithTimeout`). If the search does not return results within that window, the request is aborted, and the chat immediately falls back to the profile's local memory—the data already loaded with the page, such as links, project titles, and basic biographical details.

This architecture ensures that semantic embedding and vector database misses never delay the public chat critical path. The system races the retrieval against a hard clock, guaranteeing that the visitor receives an answer promptly, even if the deeper knowledge base is temporarily slow.

### Direct Recall for Conversational Shortcuts

Not every visitor query requires a trip to the knowledge base. In natural conversation, users often ask trivial follow-up questions or make simple observations.

To handle these efficiently, Karte implements an intent-class shortcut mechanism before engaging the LLM or the knowledge base. Using regex against recent visitor messages, the system can instantly answer simple factual queries about the current conversation (e.g., questions about the UI or basic clarifications). By bypassing the RAG pipeline entirely for these queries, Karte conserves resources and delivers immediate responses.

## Architecture Breakdown: Operating at the Edge

Karte's memory system is deeply integrated with its edge-first architecture. The application is built with Next.js 16 (using the App Router and React 19) and deployed to Cloudflare Workers via the OpenNext adapter.

### D1 and Drizzle

The primary data store for the application is Cloudflare D1, a serverless SQL database built on SQLite. Karte uses Drizzle ORM to interact with D1, managing core app data like pages, links, projects, and the conversational state. The local development environment intentionally mirrors this production setup using local D1 instances, ensuring migration strategies are verified before deployment.

### Service Bindings and the Knowledgebase Worker

The `knowledgebase` worker operates independently but is securely connected to the main application via Cloudflare's service bindings. This architecture allows the Next.js application to communicate with the knowledge base internally, without incurring the overhead of a public HTTP request.

The interaction is handled by the `src/lib/knowledgebase.ts` client, which uses the `RAG_SERVICE` binding to manage indexes, ingest documents, and execute searches. If the service binding is unavailable (e.g., in certain local development configurations), it safely falls back to a configured URL, maintaining developer velocity.

## Transitioning Away from Third-Party RAG

A critical decision in Karte's evolution was the removal of third-party RAG dependencies. Previously, the system relied on a legacy "SaaS Maker RAG" service. However, relying on an external, generalized service introduced unnecessary complexity and risk.

By moving to the shared, managed Cloudflare `knowledgebase` worker, Karte gained full control over the indexing and retrieval process. The legacy compatibility linkage columns (such as `smProjectId` and `smApiKey`) remain in the schema to prevent migration errors, but new behavior is strictly wired to the internal managed index (`smIndexId`). This consolidation simplifies the architecture, improves reliability, and ensures that creator data remains within the trusted Cloudflare boundary.

## Conclusion: Balancing Capability with Control

Adding AI to a public profile is not about replacing the creator; it's about amplifying their context. By grounding answers in owner-authored `infoBlocks`, enforcing strict latency budgets on retrieval, and owning the underlying infrastructure, Karte provides an inbound assistant that is both intelligent and reliable.

The goal is to move visitors smoothly from discovery to a useful, well-informed handoff, preserving the creator's explicit control over their public identity at every step.

## Next Action

If you are managing a Karte profile, take a moment to review your `infoBlocks` in the authenticated dashboard. Ensure they accurately reflect your current projects and preferred conversational boundaries to provide the best possible experience for your visitors.
