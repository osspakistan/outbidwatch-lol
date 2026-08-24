import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db';
import { fetchTimelineTweets } from '../lib/x-search';

export const mcpRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const MCP_TOOLS = [
  {
    name: 'search_platforms',
    description: 'Search pay-to-rank bidding platforms by keyword, category, status, or sorting order.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or keyword' },
        category: { type: 'string', description: 'Category vertical (e.g., SaaS & Apps, Games & Battles)' },
        sort: { type: 'string', enum: ['oldest', 'newest', 'name'], description: 'Sort order' },
        limit: { type: 'integer', default: 10, description: 'Number of platforms to return' },
      },
    },
  },
  {
    name: 'get_timeline',
    description: 'Fetch latest curated builder posts, launch notes, and commentary from X about outbid platforms.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_stats',
    description: 'Get directory summary statistics including total platforms and oldest domain registration.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

mcpRouter.get('/', (c) => {
  return c.json({
    status: 'active',
    protocol: 'mcp',
    transport: 'streamable_http',
    version: '2024-11-05',
    serverInfo: {
      name: 'outbidwatch',
      version: '1.2.0',
      description: 'Model Context Protocol Server for OutbidWatch',
    },
    tools: MCP_TOOLS,
  });
});

mcpRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { jsonrpc, method, params, id } = body;

    if (jsonrpc !== '2.0') {
      return c.json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' } }, 400);
    }

    if (method === 'initialize') {
      return c.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: 'outbidwatch',
            version: '1.2.0',
          },
        },
      });
    }

    if (method === 'tools/list') {
      return c.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};
      const db = getDb(c.env.DB);

      if (toolName === 'search_platforms') {
        const { sites, meta } = await db.listSites({
          q: args.query,
          category: args.category && args.category !== 'all' ? args.category : undefined,
          limit: Math.min(Number(args.limit) || 10, 50),
          order_by: args.sort === 'name' ? 'site_name' : 'registration_date',
          order_dir: args.sort === 'newest' ? 'desc' : 'asc',
        });

        return c.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ total: meta.total, sites }, null, 2),
              },
            ],
          },
        });
      }

      if (toolName === 'get_timeline') {
        const timelineResult = await fetchTimelineTweets(c.env);
        return c.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(timelineResult.tweets.slice(0, 15), null, 2),
              },
            ],
          },
        });
      }

      if (toolName === 'get_stats') {
        const stats = await db.getStats();
        return c.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(stats, null, 2),
              },
            ],
          },
        });
      }

      return c.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method or tool not found: ${toolName}` },
      });
    }

    return c.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unsupported method: ${method}` },
    });
  } catch (err: any) {
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: err.message || 'Parse error' },
    }, 500);
  }
});
