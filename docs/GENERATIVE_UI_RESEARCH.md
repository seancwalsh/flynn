# Generative UI Research Report
**Date:** 2026-01-28  
**For:** Flynn AAC Caregiver Dashboard

---

## Executive Summary

You're right - static dashboards are becoming outdated. **Generative UI** represents a paradigm shift from "one interface fits all" to "interface generated for each user, each moment."

For Flynn AAC, I recommend a **hybrid approach**: a minimal default layout with an AI chat that can dynamically inject rich UI components based on conversation context.

---

## What is Generative UI?

**Traditional UI:** Designer creates fixed layouts → Users adapt to the interface  
**Generative UI:** AI generates interface in real-time → Interface adapts to each user

### Key Capabilities
1. **Stream React components from LLM** - not just text, actual UI widgets
2. **Tool-based rendering** - LLM decides which component to show based on context
3. **Progressive disclosure** - show loading states, then resolve to rich UI
4. **Context-aware** - same question, different user = different interface

---

## The Vercel AI SDK Approach

### Core Concept: `streamUI`
Instead of the LLM returning text that you render, the LLM returns **React components directly**.

```typescript
// Traditional: LLM returns text
const response = await chat("Show me Flynn's progress");
// Returns: "Flynn used 45 symbols today, up 12% from yesterday..."

// Generative UI: LLM returns components
const component = await streamUI({
  prompt: "Show me Flynn's progress",
  tools: {
    showProgressChart: {
      description: "Display vocabulary progress over time",
      render: async ({ childId, timeRange }) => {
        const data = await getProgressData(childId, timeRange);
        return <ProgressChart data={data} />;
      }
    },
    showDailyDigest: {
      description: "Show today's activity summary",
      render: async ({ childId }) => {
        const digest = await getTodayDigest(childId);
        return <DailyDigestCard digest={digest} />;
      }
    },
    showAlert: {
      description: "Display an important alert or regression warning",
      render: async ({ alert }) => {
        return <AlertBanner severity={alert.severity} message={alert.message} />;
      }
    }
  }
});
```

### How It Works
1. User asks a question in natural language
2. LLM decides which tool(s) to call based on intent
3. Tool fetches data and returns a React component
4. Component streams to the client in real-time
5. User sees a rich, interactive widget (not just text)

---

## Patterns for Flynn AAC

### Pattern 1: Chat-First with Component Injection
**The interface IS a chat.** But responses include rich components.

```
User: "How is Flynn doing this week?"

AI: [Streams WeeklySummaryCard component]
    ┌─────────────────────────────────────────┐
    │ 📊 This Week's Progress                 │
    │                                         │
    │ Vocabulary: 127 words (+8 new)          │
    │ Daily avg: 45 taps (↑ 12%)              │
    │ Top category: Animals 🦁                │
    │                                         │
    │ [View Details] [Compare to Last Week]   │
    └─────────────────────────────────────────┘
    
    Flynn had a great week! He's showing consistent 
    growth in animal vocabulary. Want me to show 
    which specific words he learned?

User: "Yes, show me the new words"

AI: [Streams NewWordsGrid component]
    ┌─────────────────────────────────────────┐
    │ 🆕 New Words This Week                  │
    │                                         │
    │ 🐘 elephant  🦒 giraffe  🐧 penguin     │
    │ 🍎 apple     🚗 car      ✈️ airplane    │
    │ 😊 happy     😢 sad                     │
    └─────────────────────────────────────────┘
```

### Pattern 2: Insight-Driven Dashboard Generation
**No fixed dashboard.** On load, AI generates today's relevant views.

```typescript
// On dashboard load
const dashboard = await streamUI({
  prompt: `Generate a dashboard for ${caregiver.name} 
           about ${child.name}'s recent activity.
           Consider: ${recentInsights.map(i => i.type).join(', ')}
           Prioritize: alerts, milestones, then trends`,
  tools: {
    alertSection: { ... },
    milestoneCard: { ... },
    trendChart: { ... },
    quickActions: { ... },
    upcomingTherapy: { ... }
  }
});
```

**Monday morning:** Shows weekly summary + upcoming therapy sessions  
**After regression detected:** Leads with alert banner + trend analysis  
**After milestone:** Celebration card + share options  

### Pattern 3: Morphing Interface
**Start minimal, expand based on interaction.**

```
Initial state:
┌─────────────────────────────────────────────────┐
│ Good morning, Galya! 👋                         │
│                                                 │
│ Flynn is doing well. Ask me anything or tap    │
│ a quick action below.                          │
│                                                 │
│ [📊 Progress] [🎯 Goals] [📝 Add Note]         │
└─────────────────────────────────────────────────┘

User taps [📊 Progress]:
┌─────────────────────────────────────────────────┐
│ Good morning, Galya! 👋                         │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │         [Progress Chart Component]          │ │
│ │    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~             │ │
│ │    Vocabulary growth over 30 days           │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Flynn's vocabulary grew 23% this month.         │
│ Want to see which categories improved most?     │
│                                                 │
│ [Yes, show categories] [Compare to peers]       │
└─────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Recommended Stack
```
┌─────────────────────────────────────────────────┐
│                  Frontend                        │
│  Next.js 14+ (App Router + Server Components)   │
│  + Vercel AI SDK (@ai-sdk/react, @ai-sdk/rsc)   │
│  + shadcn/ui components                          │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Server Actions                      │
│  streamUI() calls with tool definitions         │
│  Each tool = React component generator          │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Flynn Backend API                   │
│  (existing Hono API - data source)              │
└─────────────────────────────────────────────────┘
```

### Key Dependencies
```json
{
  "@ai-sdk/react": "latest",
  "@ai-sdk/openai": "latest",  // or @ai-sdk/anthropic
  "ai": "latest",
  "next": "14.x",
  "react": "18.x"
}
```

### Migration Path from Current Caregiver Web
1. Keep existing pages as fallback
2. Add new `/chat` route with streamUI
3. Gradually move dashboard widgets into streamUI tools
4. Eventually: chat becomes the primary interface

---

## Benefits for Flynn AAC

### For Caregivers (Galya)
- **Ask questions naturally** - "Is Flynn regressing?" not "click Reports → Trends → Filter"
- **Context-aware insights** - AI knows what matters RIGHT NOW
- **No dashboard fatigue** - Interface shows what's relevant, hides what's not

### For Therapists
- **Quick session prep** - "Summarize Flynn's week before our session"
- **Goal tracking** - "Show me progress on the 'request items' goal"
- **Cross-therapy view** - "How is ABA work supporting his speech therapy?"

### For the Product
- **Faster iteration** - Add new insight types without redesigning UI
- **Personalization at scale** - Every caregiver gets their own experience
- **Differentiation** - Most AAC dashboards are static; this is next-gen

---

## Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| **Latency** - LLM calls take time | Stream UI progressively; show skeletons; cache common queries |
| **Cost** - Every interaction = API call | Use smaller models for routing; cache aggressively; batch insights |
| **Consistency** - UI changes every time | Define component library; LLM picks from fixed set, not generating raw HTML |
| **Reliability** - LLM might hallucinate | Ground responses in real data; tools fetch from your API only |
| **Accessibility** - Generated UI must be accessible | Pre-built accessible components; LLM just picks which to show |

---

## Recommendation for Flynn

### Phase 1: Chat + Components (Quick Win)
- Add a chat interface to caregiver-web
- Define 5-10 tools that render existing dashboard components
- Keep current dashboard as fallback

**Tools to build:**
1. `showDailyDigest` - Today's summary card
2. `showProgressChart` - Vocabulary/usage trends
3. `showGoalProgress` - Therapy goal tracking
4. `showRecentAlerts` - Anomalies/regressions
5. `showNewWords` - Recently learned vocabulary
6. `addNote` - Quick observation form
7. `showUpcomingSessions` - Therapy calendar
8. `compareWeeks` - Week-over-week comparison

### Phase 2: Insight-Driven Home
- Replace static dashboard with AI-generated daily view
- Prioritize based on what's new/important

### Phase 3: Full Generative
- Chat IS the app
- Minimal chrome, maximum AI-driven content
- Mobile-first design

---

## Alternative Approaches Considered

### 1. Traditional Dashboard + AI Summary
**Pros:** Simpler, familiar  
**Cons:** Two separate experiences, doesn't scale personalization

### 2. Widget-Based Customization
**Pros:** User control  
**Cons:** Cognitive load, most users won't customize

### 3. Full Chat (Text Only)
**Pros:** Maximum flexibility  
**Cons:** Misses visual data representation, slow for quick glances

### 4. Generative UI (Recommended) ✅
**Pros:** Best of both - natural interaction + rich visuals  
**Cons:** More complex to build initially

---

## Next Steps (When Ready)

1. **Prototype:** Build a simple chat + 3 tools in caregiver-web
2. **Test:** See how Galya interacts with it
3. **Iterate:** Add more tools based on what questions she asks
4. **Expand:** Replace dashboard sections one at a time

---

## Resources

- [Vercel AI SDK Docs](https://ai-sdk.dev/docs)
- [streamUI Reference](https://ai-sdk.dev/docs/reference/ai-sdk-rsc/stream-ui)
- [Vercel AI Chatbot Template](https://github.com/vercel/ai-chatbot)
- [NN/g: Generative UI and Outcome-Oriented Design](https://www.nngroup.com/articles/generative-ui/)

---

*"The best interface is no interface — or rather, an interface that builds itself around what you need right now."*
