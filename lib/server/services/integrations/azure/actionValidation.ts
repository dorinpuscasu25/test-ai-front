export const getActionSequence = (workflowDefinition: any): string[] => {
  const actions = workflowDefinition.actions || {};
  const actionRunAfterMap = new Map<string, string[]>();
  const actionIds = Object.keys(actions);

  actionIds.forEach((id) => {
    const action = actions[id];
    const runAfterKeys = Object.keys(action.runAfter || {});
    actionRunAfterMap.set(id, runAfterKeys);
  });

  const rootActions = actionIds.filter((id) => (actionRunAfterMap.get(id) || []).length === 0);

  const visited = new Set<string>();
  const orderedActions: string[] = [];

  function visit(actionId: string) {
    if (visited.has(actionId)) return;
    visited.add(actionId);

    const dependencies = actionRunAfterMap.get(actionId) || [];
    dependencies.forEach(visit);

    orderedActions.push(actionId);
  }

  rootActions.forEach(visit);

  actionIds.forEach((id) => {
    if (!visited.has(id)) {
      orderedActions.push(id);
    }
  });

  return orderedActions;
};

export const validateActionAddition = (
  actionType: string,
  workflowDefinition: any,
  previousNodeId?: string | null,
): {isValid: boolean; errorMessage?: string} => {
  const actions = workflowDefinition.actions || {};

  if (actionType === "testcase") {
    if (!previousNodeId) {
      return {
        isValid: false,
        errorMessage: `"Generate Test Case requires a Knowledgebase or Jira action in the workflow.`,
      };
    }

    if (previousNodeId) {
      const orderedActions = getActionSequence(workflowDefinition);
      const previousNodeIndex = orderedActions.indexOf(previousNodeId);

      if (previousNodeIndex === -1) {
        return {
          isValid: false,
          errorMessage: "The specified previous node does not exist in the workflow.",
        };
      }

      const nodesSoFar = orderedActions.slice(0, previousNodeIndex + 1);

      const hasJiraBefore = nodesSoFar.some(
        (nodeId) => actions[nodeId]?.metadata?.actionType === "jira",
      );

      const hasKnowledgebaseBefore = nodesSoFar.some(
        (nodeId) => actions[nodeId]?.metadata?.actionType === "knowledgebase",
      );

      console.log("sdsddsdd", !hasKnowledgebaseBefore && !hasJiraBefore);
      if (!hasKnowledgebaseBefore && !hasJiraBefore) {
        return {
          isValid: false,
          errorMessage: `Generate Test Case requires a Knowledgebase or Jira action in the workflow.`,
        };
      }
    }
  }

  if (actionType === "testdata" || actionType === "testautomationscript") {
    const testcaseExists = Object.values(actions).some(
      (action: any) => action.metadata?.actionType === "testcase",
    );

    if (!testcaseExists) {
      return {
        isValid: false,
        errorMessage: `${actionType === "testdata" ? "Generate Test Data" : "Generate Test Automation Script"} requires a Generate Test Case action in the workflow.`,
      };
    }

    if (previousNodeId) {
      const orderedActions = getActionSequence(workflowDefinition);
      const previousNodeIndex = orderedActions.indexOf(previousNodeId);

      if (previousNodeIndex === -1) {
        return {
          isValid: false,
          errorMessage: "The specified previous node does not exist in the workflow.",
        };
      }

      const nodesSoFar = orderedActions.slice(0, previousNodeIndex + 1);

      const hasTestCaseBefore = nodesSoFar.some(
        (nodeId) => actions[nodeId]?.metadata?.actionType === "testcase",
      );

      if (!hasTestCaseBefore) {
        return {
          isValid: false,
          errorMessage: `${actionType === "testdata" ? "Generate Test Data" : "Generate Test Automation Script"} must be placed after a Generate Test Case action in the workflow.`,
        };
      }
    }
  }

  return {isValid: true};
};
