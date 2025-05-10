import {getAvailableActions} from "@/types/azure/actions";

export const testCaseGeneratorActions = () => {
  const availableActions = getAvailableActions();

  return [
    {
      action: availableActions.KnowledgeBase,
      config: {
        id: "KnowledgeBase",
        previousNodeId: null,
        nextNodeId: "GetJiraTickets",
      },
    },
    {
      action: availableActions.GetJiraTickets,
      config: {
        id: "GetJiraTickets",
        previousNodeId: "KnowledgeBase",
        nextNodeId: "GenerateTestCases",
      },
    },
    {
      action: availableActions.GenerateTestCases,
      config: {
        id: "GenerateTestCases",
        previousNodeId: "GetJiraTickets",
        nextNodeId: null,
      },
    },
  ];
};
