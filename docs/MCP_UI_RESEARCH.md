# MCP-UI Research

## Overview

MCP-UI is an SDK implementing the [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) standard for UI over MCP (Model Context Protocol). It enables AI tools to return interactive UI alongside their responses.

## Key Packages

### Server-Side
- `@mcp-ui/server` - Create UI resources
- `@modelcontextprotocol/ext-apps` - Official MCP Apps standard (from Anthropic)
- `@modelcontextprotocol/sdk` - Core MCP server SDK

### Client-Side
- `@mcp-ui/client` - Render tool UIs (AppRenderer, UIResourceRenderer)

## Architecture

### Current Flynn Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React)                                       │
│  ├── ChatPanel → SSE streaming from backend             │
│  ├── DashboardView → REST API for cached data           │
│  └── Widgets render based on message content            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Hono)                                         │
│  ├── /conversations → Claude chat with tool calling    │
│  ├── /insights → Pre-computed AI insights              │
│  └── Custom tool execution via ClaudeService           │
└─────────────────────────────────────────────────────────┘
```

### MCP-UI Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + MCP Client)                          │
│  ├── AppRenderer → Renders tool UIs automatically      │
│  ├── UIResourceRenderer → Legacy support               │
│  └── UI comes WITH the tool response, not separate     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  MCP Server                                             │
│  ├── registerAppTool() → Tools with _meta.ui linking   │
│  ├── registerAppResource() → UI resource handlers      │
│  └── createUIResource() → HTML/URL/RemoteDOM           │
└─────────────────────────────────────────────────────────┘
```

## Code Example

### Server: Register Tool with UI
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';

const server = new McpServer({ name: 'flynn-aac', version: '1.0.0' });

// Create UI resource for dashboard widget
const dashboardUI = createUIResource({
  uri: 'ui://flynn/dashboard',
  content: { 
    type: 'rawHtml', 
    htmlString: `
      <div class="dashboard">
        <h2>Today's Activity</h2>
        <div id="stats"></div>
        <script>
          // UI can send messages back to trigger more tools
          document.getElementById('stats').onclick = () => {
            window.parent.postMessage({
              type: 'tool',
              payload: { toolName: 'get_detailed_stats', params: {} }
            }, '*');
          };
        </script>
      </div>
    `
  },
  encoding: 'text',
});

// Register resource handler
registerAppResource(server, 'dashboard_ui', dashboardUI.resource.uri, {}, async () => ({
  contents: [dashboardUI.resource]
}));

// Register tool with _meta linking to UI
registerAppTool(server, 'show_dashboard', {
  description: 'Show the caregiver dashboard',
  inputSchema: { childId: z.string().uuid() },
  _meta: { ui: { resourceUri: dashboardUI.resource.uri } }
}, async ({ childId }) => {
  const stats = await getDashboardStats(childId);
  return { 
    content: [{ 
      type: 'text', 
      text: JSON.stringify(stats) // Data passed to UI
    }] 
  };
});
```

### Client: Render Tool UIs
```tsx
import { AppRenderer } from '@mcp-ui/client';

function ChatMessage({ toolName, toolInput, toolResult, mcpClient }) {
  return (
    <AppRenderer
      client={mcpClient}
      toolName={toolName}
      toolInput={toolInput}
      toolResult={toolResult}
      sandbox={{ url: '/mcp-sandbox' }}
      onOpenLink={async ({ url }) => window.open(url)}
      onMessage={async (params) => {
        // Handle UI actions (tool calls, prompts, etc.)
        if (params.type === 'tool') {
          await mcpClient.callTool(params.payload.toolName, params.payload.params);
        }
      }}
    />
  );
}
```

## Pros vs Current Approach

### Advantages of MCP-UI
1. **UI-Tool Coupling**: UI comes with the tool, not bolted on
2. **Standardized**: Uses official MCP Apps spec from Anthropic
3. **Interactive**: UIs can trigger more tool calls
4. **Host Agnostic**: Works across different AI hosts (VSCode, ChatGPT, etc.)
5. **Sandboxed**: Built-in security via iframe sandbox

### Advantages of Current Approach
1. **Simpler**: No MCP protocol complexity
2. **Flexible**: Full control over UI rendering
3. **Integrated**: Uses same Hono backend for everything
4. **Proven**: SSE streaming works well

## Recommendation

For Flynn AAC, consider a **hybrid approach**:

1. Keep REST API for pre-computed data (dashboard stats, cached insights)
2. Use MCP-UI for **tool responses** that need interactive UI
3. Example: When Claude calls `show_child_progress`, it returns an interactive chart widget

This gives us:
- Best of both: static dashboard + dynamic tool UIs
- Future compatibility with other MCP hosts
- Rich interactive experiences in chat

## Implementation Plan

### Phase 1: MCP Server Setup
- [ ] Create MCP server alongside existing Hono API
- [ ] Port existing tools to registerAppTool()
- [ ] Create UI resources for key tools

### Phase 2: Client Integration
- [ ] Add @mcp-ui/client to caregiver-web
- [ ] Create AppRenderer wrapper component
- [ ] Handle tool → UI rendering in chat

### Phase 3: Enhanced UIs
- [ ] Interactive charts for progress
- [ ] Clickable insights that drill down
- [ ] Form widgets for data entry

## Resources

- [mcp-ui GitHub](https://github.com/MCP-UI-Org/mcp-ui)
- [MCP Apps Spec](https://github.com/modelcontextprotocol/ext-apps)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [mcp-ui Docs](https://mcpui.dev)
