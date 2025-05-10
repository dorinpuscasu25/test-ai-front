export const NODE_TYPES = {
  TRIGGER: "trigger",
  ACTION: "action",
  CONDITION: "condition",
} as const;

export const ACTION_CATEGORIES = {
  AI: "AI",
  DATA: "Data",
  INTEGRATIONS: "Integrations",
  CONTROL_FLOW: "Control Flow",
  RESEARCH: "Research",
} as const;

export const AVAILABLE_ACTIONS = [
  {
    id: "generate-text",
    name: "Generate Text",
    category: ACTION_CATEGORIES.AI,
    description: "Uses AI models to generate text from a prompt",
    icon: "MessageSquare",
  },
  {
    id: "search-knowledge-base",
    name: "Search Knowledge Base",
    category: ACTION_CATEGORIES.RESEARCH,
    description: "Search through your organisation's knowledge base",
    icon: "Search",
  },
  {
    id: "translate-text",
    name: "Translate Text",
    category: ACTION_CATEGORIES.AI,
    description: "Translate text to a selected language",
    icon: "Languages",
  },
  {
    id: "analyze-sentiment",
    name: "Analyze Sentiment",
    category: ACTION_CATEGORIES.AI,
    description: "Analyze the sentiment of provided text",
    icon: "LineChart",
  },
  {
    id: "conditional",
    name: "Conditional",
    category: ACTION_CATEGORIES.CONTROL_FLOW,
    description: "Add conditional logic to your workflow",
    icon: "GitBranch",
  },
] as const;
