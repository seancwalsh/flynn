/**
 * Test Data for E2E Tests
 * 
 * Provides consistent mock data for all tests.
 */

export const mockUser = {
  id: 'user_test123',
  email: 'test@example.com',
  role: 'caregiver',
  createdAt: '2024-01-01T00:00:00Z',
};

export const mockChild = {
  id: 'child_test123',
  name: 'Test Child',
  age: 6,
};

export const mockConversations = [
  {
    id: 'conv_1',
    userId: mockUser.id,
    childId: mockChild.id,
    title: 'First conversation',
    messageCount: 3,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T12:30:00Z',
    deletedAt: null,
  },
  {
    id: 'conv_2',
    userId: mockUser.id,
    childId: mockChild.id,
    title: 'Symbols practice',
    messageCount: 5,
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T11:00:00Z',
    deletedAt: null,
  },
  {
    id: 'conv_3',
    userId: mockUser.id,
    childId: mockChild.id,
    title: 'Communication tips',
    messageCount: 2,
    createdAt: '2024-01-13T08:00:00Z',
    updatedAt: '2024-01-13T09:00:00Z',
    deletedAt: null,
  },
];

export const mockMessages = [
  {
    id: 'msg_1',
    conversationId: 'conv_1',
    role: 'user',
    content: 'How can I help my child learn new symbols?',
    model: null,
    toolCalls: null,
    toolResults: null,
    tokenUsage: null,
    metadata: null,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'msg_2',
    conversationId: 'conv_1',
    role: 'assistant',
    content: 'Here are some tips for helping your child learn new symbols:\n\n1. Start with familiar objects\n2. Use consistent repetition\n3. Celebrate small wins\n4. Make it fun with games',
    model: 'gpt-4',
    toolCalls: null,
    toolResults: null,
    tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    metadata: null,
    createdAt: '2024-01-15T10:00:30Z',
  },
  {
    id: 'msg_3',
    conversationId: 'conv_1',
    role: 'user',
    content: 'What symbols should I start with?',
    model: null,
    toolCalls: null,
    toolResults: null,
    tokenUsage: null,
    metadata: null,
    createdAt: '2024-01-15T12:30:00Z',
  },
];

export const mockMessageWithToolCall = {
  id: 'msg_tool_1',
  conversationId: 'conv_1',
  role: 'assistant',
  content: "I'll look up the recommended starting symbols for your child.",
  model: 'gpt-4',
  toolCalls: [
    {
      id: 'tc_1',
      type: 'function',
      function: {
        name: 'get_recommended_symbols',
        arguments: '{"age": 6, "level": "beginner"}',
      },
    },
  ],
  toolResults: [
    {
      toolCallId: 'tc_1',
      content: '["want", "more", "help", "yes", "no", "eat", "drink"]',
    },
  ],
  tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
  metadata: null,
  createdAt: '2024-01-15T12:31:00Z',
};

export const createStreamingResponse = (content: string) => {
  const messageId = `msg_${Date.now()}`;
  
  const events = [
    `data: ${JSON.stringify({
      type: 'message_start',
      data: {
        id: messageId,
        conversationId: 'conv_1',
        role: 'assistant',
        model: 'gpt-4',
      },
    })}\n\n`,
    
    // Split content into chunks to simulate streaming
    ...content.split(' ').map((word, i) => 
      `data: ${JSON.stringify({
        type: 'content_delta',
        data: { delta: (i === 0 ? '' : ' ') + word },
      })}\n\n`
    ),
    
    `data: ${JSON.stringify({
      type: 'message_end',
      data: {
        tokenUsage: { promptTokens: 50, completionTokens: content.split(' ').length * 2, totalTokens: 50 + content.split(' ').length * 2 },
      },
    })}\n\n`,
  ];
  
  return events.join('');
};

export const createToolCallStreamingResponse = () => {
  const messageId = `msg_${Date.now()}`;
  const toolCallId = `tc_${Date.now()}`;
  
  return [
    `data: ${JSON.stringify({
      type: 'message_start',
      data: {
        id: messageId,
        conversationId: 'conv_1',
        role: 'assistant',
        model: 'gpt-4',
      },
    })}\n\n`,
    
    `data: ${JSON.stringify({
      type: 'content_delta',
      data: { delta: "Let me check that for you..." },
    })}\n\n`,
    
    `data: ${JSON.stringify({
      type: 'tool_call_start',
      data: {
        toolCallId,
        name: 'get_child_progress',
        arguments: '{"childId": "child_test123"}',
      },
    })}\n\n`,
    
    // Simulate tool execution delay in the test itself
    
    `data: ${JSON.stringify({
      type: 'tool_result',
      data: {
        toolCallId,
        result: '{"symbolsLearned": 15, "sessionsThisWeek": 5}',
      },
    })}\n\n`,
    
    `data: ${JSON.stringify({
      type: 'content_delta',
      data: { delta: " Based on the data, your child has learned 15 symbols and had 5 sessions this week!" },
    })}\n\n`,
    
    `data: ${JSON.stringify({
      type: 'message_end',
      data: {
        tokenUsage: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
      },
    })}\n\n`,
  ].join('');
};
