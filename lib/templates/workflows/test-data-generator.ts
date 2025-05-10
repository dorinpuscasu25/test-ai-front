import {getAvailableActions} from "@/types/azure/actions";

export const testDataGeneratorActions = () => {
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
        nextNodeId: "GenerateTestData",
      },
    },
    {
      action: availableActions.GenerateTestData,
      config: {
        id: "GenerateTestData",
        previousNodeId: "GenerateTestCases",
        nextNodeId: null,
      },
    },
  ];
};
