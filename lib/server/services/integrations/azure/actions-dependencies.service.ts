import {getWorkflowDetails} from "@/lib/server/services/integrations/azure/microsoft-logic.service";

export interface WorkflowAction {
  id: string;
  name: string;
  type: string;
  properties?: any;
  inputs?: any;
  title?: string;
  actionType?: string;
  description?: string;
  icon?: any;
  runAfter?: Record<string, string[]>;
  metadata?: {
    actionType?: string;
    originalName?: string;
  };
}

/**
 * Extracts all actions from a workflow definition that come before a specified action.
 *
 * @param workflowId - ID of the workflow
 * @param currentActionId - ID of the current action
 * @returns Promise containing an array of previous actions
 */
export const getPreviousActions = async (
  workflowId: string,
  currentActionId?: string,
): Promise<WorkflowAction[]> => {
  try {
    const workflowDetails = await getWorkflowDetails(workflowId);
    const workflowActions = workflowDetails.actions || {};

    const actionsList = Object.entries(workflowActions).map(([id, actionData]: [string, any]) => ({
      id,
      ...actionData,
      name: actionData.metadata?.originalName || id,
      title: actionData.metadata?.originalName || id,
      actionType: actionData.metadata?.actionType || actionData.type,
    }));

    if (!currentActionId) {
      return actionsList;
    }
    const currentAction = actionsList.find((action) => action.id === currentActionId);

    if (!currentAction) {
      return actionsList;
    }

    const actionOrder = determineActionOrder(actionsList);

    const currentActionIndex = actionOrder.findIndex((action) => action.id === currentActionId);

    if (currentActionIndex === -1) {
      return actionsList;
    }

    return actionOrder.slice(0, currentActionIndex);
  } catch (error) {
    console.error("Error getting previous actions:", error);
    throw new Error("Failed to get previous actions");
  }
};

/**
 * Determines the execution order of actions in a workflow based on runAfter dependencies
 */
const determineActionOrder = (actions: WorkflowAction[]): WorkflowAction[] => {
  // Build a dependency graph
  const dependencyGraph: Record<string, string[]> = {};
  const indegree: Record<string, number> = {};

  actions.forEach((action) => {
    dependencyGraph[action.id] = [];
    indegree[action.id] = 0;
  });

  actions.forEach((action) => {
    if (action.runAfter) {
      const dependencies = Object.keys(action.runAfter);
      dependencies.forEach((depId) => {
        if (dependencyGraph[depId]) {
          dependencyGraph[depId].push(action.id);
          indegree[action.id] = (indegree[action.id] || 0) + 1;
        }
      });
    }
  });

  const queue: string[] = [];
  const result: WorkflowAction[] = [];

  Object.keys(indegree).forEach((actionId) => {
    if (indegree[actionId] === 0) {
      queue.push(actionId);
    }
  });

  // Process the queue
  while (queue.length > 0) {
    const actionId = queue.shift()!;
    const action = actions.find((a) => a.id === actionId);

    if (action) {
      result.push(action);

      // Update dependencies
      dependencyGraph[actionId].forEach((dependent) => {
        indegree[dependent]--;
        if (indegree[dependent] === 0) {
          queue.push(dependent);
        }
      });
    }
  }

  // If there are actions with circular dependencies, add them at the end
  const remainingActions = actions.filter((action) => !result.some((a) => a.id === action.id));
  return [...result, ...remainingActions];
};

/**
 * Gets available actions that can be used as dependencies for a specific action type
 *
 * @param workflowId - ID of the workflow
 * @param actionType - Type of the current action
 * @param actionId - ID of the current action (to exclude from results)
 * @returns Promise containing an array of compatible previous actions
 */
export const getCompatibleDependencies = async (
  workflowId: string,
  actionType: string,
  actionId?: string,
): Promise<WorkflowAction[]> => {
  const previousActions = await getPreviousActions(workflowId, actionId);
  return previousActions;
};
