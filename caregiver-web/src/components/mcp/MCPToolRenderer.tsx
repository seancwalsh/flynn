/**
 * MCP Tool Renderer Component
 * 
 * Renders MCP tool responses with their associated UI resources.
 * Uses @mcp-ui/client for UI rendering.
 * 
 * This is a competing approach to the static dashboard widgets.
 * Instead of pre-built React components, the UI comes from the MCP server.
 */

import * as React from "react";
// import { AppRenderer } from "@mcp-ui/client";

interface MCPToolResult {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult: {
    content: Array<{ type: string; text?: string }>;
  };
}

interface MCPToolRendererProps {
  result: MCPToolResult;
  className?: string;
}

/**
 * Renders an MCP tool result with its associated UI.
 * 
 * When the MCP server returns a tool result, it includes a _meta.ui.resourceUri
 * that points to a UI resource. The AppRenderer fetches that resource and
 * renders it in a sandboxed iframe.
 */
export function MCPToolRenderer({ result, className }: MCPToolRendererProps) {
  // For now, render the raw JSON since we need the full MCP client setup
  // In production, this would use AppRenderer from @mcp-ui/client
  
  const parsedResult = React.useMemo(() => {
    try {
      const textContent = result.toolResult.content.find(c => c.type === 'text');
      return textContent?.text ? JSON.parse(textContent.text) : null;
    } catch {
      return null;
    }
  }, [result]);

  return (
    <div className={className}>
      {/* 
        In the full implementation, this would be:
        
        <AppRenderer
          client={mcpClient}
          toolName={result.toolName}
          toolInput={result.toolInput}
          toolResult={result.toolResult}
          sandbox={{ url: "/mcp-sandbox" }}
          onOpenLink={({ url }) => window.open(url)}
          onMessage={(params) => handleMCPMessage(params)}
        />
        
        For now, we render a placeholder showing the data structure.
      */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-1">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔧</span>
            <span className="font-semibold text-gray-900">{result.toolName}</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              MCP Tool
            </span>
          </div>
          
          {parsedResult && (
            <div className="space-y-3">
              {/* Child info */}
              {parsedResult.child && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                    {parsedResult.child.name?.[0]}
                  </div>
                  <div>
                    <div className="font-medium">{parsedResult.child.name}</div>
                    {parsedResult.child.age && (
                      <div className="text-sm text-gray-500">{parsedResult.child.age} years old</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Today stats */}
              {parsedResult.today && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {parsedResult.today.sessionsLogged}
                    </div>
                    <div className="text-xs text-gray-500">Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {parsedResult.today.wordsUsed}
                    </div>
                    <div className="text-xs text-gray-500">Words</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {parsedResult.today.communicationAttempts}
                    </div>
                    <div className="text-xs text-gray-500">Attempts</div>
                  </div>
                </div>
              )}
              
              {/* Observation */}
              {parsedResult.today?.observation && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span>✨</span>
                    <p className="text-sm text-gray-700 italic">
                      "{parsedResult.today.observation}"
                    </p>
                  </div>
                </div>
              )}
              
              {/* Insights */}
              {parsedResult.insights?.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm font-medium text-gray-700">Insights</div>
                  {parsedResult.insights.map((insight: { id: string; title: string; body?: string }) => (
                    <div 
                      key={insight.id}
                      className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span>💡</span>
                        <div>
                          <div className="font-medium text-sm">{insight.title}</div>
                          {insight.body && (
                            <div className="text-xs text-gray-600 mt-1">{insight.body}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!parsedResult && (
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(result.toolResult, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default MCPToolRenderer;
