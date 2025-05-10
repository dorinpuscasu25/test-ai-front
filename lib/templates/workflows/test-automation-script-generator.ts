import {getAvailableActions} from "@/types/azure/actions";

export const testAutomationScriptGeneratorActions = () => {
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
        nextNodeId: "GenerateTestAutomationScript",
      },
    },
    {
      action: availableActions.GenerateTestAutomationScript,
      config: {
        id: "GenerateTestAutomationScript",
        previousNodeId: "GenerateTestCases",
        nextNodeId: null,
      },
    },
  ];
};
