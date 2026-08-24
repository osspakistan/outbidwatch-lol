# AI Agent Readiness & Protocols Guide

> OutbidWatch is engineered from the ground up to be 100/100 discoverable and navigable by autonomous AI agents and LLMs.

---

## 1. Benchmark Scores

- **Vercel Agent-Ready Benchmark**: **98 / 100**
- **Cloudflare AI Crawler Compatibility**: **93 / 100**

---

## 2. Supported Autonomous Protocols

| Protocol / Standard | Endpoint | Purpose |
|---|---|---|
| **Markdown Negotiation** | `Accept: text/markdown` | Token-efficient structured Markdown responses for LLM consumption |
| **Direct Markdown URLs** | `/index.md`, `/timeline.md`, `/boards/:domain.md` | Direct plain-text documentation endpoints |
| **LLMs Discovery** | [`/llms.txt`](https://outbidwatch.lol/llms.txt), [`/llms-full.txt`](https://outbidwatch.lol/llms-full.txt) | LLM developer documentation & full knowledge base |
| **Model Context Protocol** | [`/.well-known/mcp/server-card.json`](https://outbidwatch.lol/.well-known/mcp/server-card.json) | SEP-1649 MCP Server Card for autonomous tool execution |
| **API Catalog RFC 9727** | [`/.well-known/api-catalog`](https://outbidwatch.lol/.well-known/api-catalog) | Standard RFC 9727 linkset for machine API discovery |
| **WebMCP Browser Protocol** | Injected in `window.navigator.modelContext` | Chrome WebMCP extension standard for AI browser agents |
| **OpenAPI 3.1 Specification** | [`/openapi.json`](https://outbidwatch.lol/openapi.json) | Machine-readable API schema with Model Provider Protocol (MPP) tags |
| **Schema.org JSON-LD** | Injected in all SSR HTML headers | Structured `SoftwareApplication`, `WebSite`, and `ItemList` graphs |

---

[← Back to README](../README.md)
