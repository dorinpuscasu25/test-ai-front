import {getAvailableActions} from "@/types/azure/actions";

export const requirementAnalyserGeneratorActions = () => {
  const availableActions = getAvailableActions();

  return [
    {
      action: availableActions.KnowledgeBase,
      config: {
        id: "KnowledgeBase",
        previousNodeId: null,
        nextNodeId: "RequirementAnalyser",
      },
    },
    {
      action: availableActions.RequirementAnalyser,
      config: {
        id: "RequirementAnalyser",
        previousNodeId: "KnowledgeBase",
        nextNodeId: null,
      },
    },
  ];
};
