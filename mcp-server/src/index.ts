/**
 * Flynn AAC MCP Server
 * 
 * MCP server with UI resources for the caregiver dashboard.
 * Uses @mcp-ui/server for creating interactive tool UIs.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppTool, registerAppResource } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';
import { z } from 'zod';

// =============================================================================
// SERVER SETUP
// =============================================================================

const server = new McpServer({
  name: 'flynn-aac',
  version: '1.0.0',
});

// =============================================================================
// UI RESOURCES
// =============================================================================

// Dashboard Widget UI
const dashboardWidgetUI = createUIResource({
  uri: 'ui://flynn/dashboard-widget',
  content: {
    type: 'rawHtml',
    htmlString: `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .dashboard {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #667eea;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      font-weight: bold;
    }
    .name { font-size: 18px; font-weight: 600; color: #1a1a2e; }
    .subtitle { font-size: 12px; color: #666; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f8f9ff;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-value { font-size: 28px; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 11px; color: #666; text-transform: uppercase; }
    .insight-card {
      background: #fff9e6;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .insight-card:hover { transform: translateY(-2px); }
    .insight-icon { font-size: 20px; margin-bottom: 8px; }
    .insight-text { font-size: 14px; color: #1a1a2e; }
    .ask-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      margin-top: 8px;
    }
    .chat-input {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
    .chat-input input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
    }
    .chat-input input:focus { border-color: #667eea; }
    .chat-input button {
      background: #667eea;
      color: white;
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="header">
      <div class="avatar" id="childInitial">F</div>
      <div>
        <div class="name" id="childName">Loading...</div>
        <div class="subtitle" id="childAge"></div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="sessionsCount">0</div>
        <div class="stat-label">Sessions Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="wordsCount">0</div>
        <div class="stat-label">Words Used</div>
      </div>
    </div>
    
    <div id="insights"></div>
    
    <div class="chat-input">
      <input type="text" id="chatInput" placeholder="Ask about progress..." />
      <button onclick="sendMessage()">→</button>
    </div>
  </div>

  <script>
    // Get data from tool result (passed by MCP host)
    const toolResult = window.__MCP_TOOL_RESULT__ || {};
    const data = JSON.parse(toolResult.content?.[0]?.text || '{}');
    
    // Populate UI with data
    if (data.child) {
      document.getElementById('childName').textContent = data.child.name;
      document.getElementById('childInitial').textContent = data.child.name[0];
      if (data.child.age) {
        document.getElementById('childAge').textContent = data.child.age + ' years old';
      }
    }
    
    if (data.today) {
      document.getElementById('sessionsCount').textContent = data.today.sessionsLogged;
      document.getElementById('wordsCount').textContent = data.today.wordsUsed;
    }
    
    if (data.insights?.length) {
      const insightsHtml = data.insights.map(insight => \`
        <div class="insight-card" onclick="askAbout('\${insight.title}')">
          <div class="insight-icon">💡</div>
          <div class="insight-text">\${insight.body || insight.title}</div>
          <button class="ask-btn">Ask about this</button>
        </div>
      \`).join('');
      document.getElementById('insights').innerHTML = insightsHtml;
    }
    
    function askAbout(topic) {
      window.parent.postMessage({
        type: 'prompt',
        payload: { prompt: 'Tell me more about: ' + topic }
      }, '*');
    }
    
    function sendMessage() {
      const input = document.getElementById('chatInput');
      const message = input.value.trim();
      if (message) {
        window.parent.postMessage({
          type: 'prompt',
          payload: { prompt: message }
        }, '*');
        input.value = '';
      }
    }
    
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
    `,
  },
  encoding: 'text',
});

// Today Stats Widget UI
const todayStatsUI = createUIResource({
  uri: 'ui://flynn/today-stats',
  content: {
    type: 'rawHtml',
    htmlString: `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 12px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .title { 
      font-size: 14px; 
      font-weight: 600; 
      color: #1a1a2e;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .stats { display: flex; gap: 16px; }
    .stat { text-align: center; flex: 1; }
    .stat-value { font-size: 24px; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 11px; color: #666; }
    .observation {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #444;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">📊 Today</div>
    <div class="stats">
      <div class="stat">
        <div class="stat-value" id="sessions">0</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="words">0</div>
        <div class="stat-label">Words</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="attempts">0</div>
        <div class="stat-label">Attempts</div>
      </div>
    </div>
    <div class="observation" id="observation" style="display: none;"></div>
  </div>

  <script>
    const toolResult = window.__MCP_TOOL_RESULT__ || {};
    const data = JSON.parse(toolResult.content?.[0]?.text || '{}');
    
    document.getElementById('sessions').textContent = data.sessionsLogged || 0;
    document.getElementById('words').textContent = data.wordsUsed || 0;
    document.getElementById('attempts').textContent = data.communicationAttempts || 0;
    
    if (data.observation) {
      const obs = document.getElementById('observation');
      obs.textContent = '"' + data.observation + '"';
      obs.style.display = 'block';
    }
  </script>
</body>
</html>
    `,
  },
  encoding: 'text',
});

// =============================================================================
// REGISTER RESOURCES
// =============================================================================

registerAppResource(server, 'dashboard_widget', dashboardWidgetUI.resource.uri, {}, async () => ({
  contents: [dashboardWidgetUI.resource],
}));

registerAppResource(server, 'today_stats', todayStatsUI.resource.uri, {}, async () => ({
  contents: [todayStatsUI.resource],
}));

// =============================================================================
// REGISTER TOOLS
// =============================================================================

// Show Dashboard Tool
registerAppTool(
  server,
  'show_dashboard',
  {
    description: 'Show the caregiver dashboard with today\'s activity and insights for a child',
    inputSchema: z.object({
      childId: z.string().uuid().describe('The ID of the child'),
    }),
    _meta: { ui: { resourceUri: dashboardWidgetUI.resource.uri } },
  },
  async ({ childId }) => {
    // In production, this would fetch from the database
    // For now, return mock data
    const dashboardData = {
      child: {
        id: childId,
        name: 'Flynn',
        age: 5,
      },
      today: {
        sessionsLogged: 3,
        wordsUsed: 47,
        communicationAttempts: 12,
        observation: 'More spontaneous requests today',
      },
      insights: [
        {
          id: '1',
          type: 'trend_up',
          title: 'Speech variety up 15%',
          body: 'Flynn used more unique words this week compared to last week',
        },
        {
          id: '2', 
          type: 'milestone',
          title: 'New 3-word phrases!',
          body: 'First time combining 3 words consistently',
        },
      ],
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(dashboardData) }],
    };
  }
);

// Get Today Stats Tool
registerAppTool(
  server,
  'get_today_stats',
  {
    description: 'Get today\'s activity statistics for a child',
    inputSchema: z.object({
      childId: z.string().uuid().describe('The ID of the child'),
    }),
    _meta: { ui: { resourceUri: todayStatsUI.resource.uri } },
  },
  async ({ childId }) => {
    const stats = {
      sessionsLogged: 3,
      wordsUsed: 47,
      communicationAttempts: 12,
      observation: 'More spontaneous requests today',
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(stats) }],
    };
  }
);

// Get Insights Tool (no UI - text only)
registerAppTool(
  server,
  'get_insights',
  {
    description: 'Get AI-generated insights about a child\'s progress',
    inputSchema: z.object({
      childId: z.string().uuid().describe('The ID of the child'),
      limit: z.number().optional().default(5).describe('Maximum insights to return'),
    }),
  },
  async ({ childId, limit }) => {
    const insights = [
      {
        type: 'trend_up',
        title: 'Speech variety up 15%',
        body: 'Flynn used more unique words this week compared to last week. He\'s expanding his vocabulary!',
      },
      {
        type: 'milestone',
        title: 'New 3-word phrases!',
        body: 'Flynn combined 3 words for the first time consistently: "I want juice", "more play please".',
      },
    ];

    return {
      content: [{ type: 'text', text: JSON.stringify(insights.slice(0, limit)) }],
    };
  }
);

// =============================================================================
// START SERVER
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Flynn AAC MCP Server running on stdio');
}

main().catch(console.error);
