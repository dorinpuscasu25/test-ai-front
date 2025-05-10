import {getAzureAccessToken} from "@/config/azure";
import axios from "axios";
import {
  AZURE_API_VERSION,
  AZURE_MANAGEMENT_API,
  AZURE_RESOURCE_GROUP,
  AZURE_SUBSCRIPTION_ID,
} from "@/lib/constants";
import {extractLastUuid, getHeaders} from "@/lib/utils";
import {getAvailableActions, getDataPathsForAction} from "@/types/azure/actions";
import {validateActionAddition} from "@/lib/server/services/integrations/azure/actionValidation";

async function checkAndCreateConnection(connectionType?: string): Promise<void> {
  if (!connectionType) return;

  try {
    const accessToken = await getAzureAccessToken();
    const connectionPayload = {
      location: process.env.AZURE_REGION || "eastus",
      properties: {
        displayName: connectionType,
        api: {
          id: `/subscriptions/${AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Web/locations/${process.env.AZURE_REGION}/managedApis/${connectionType}`,
        },
      },
    };

    const url = `${AZURE_MANAGEMENT_API}/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Web/connections/${connectionType}?api-version=2018-07-01-preview`;
    await axios.put(url, connectionPayload, {
      headers: getHeaders(accessToken),
    });
  } catch (error) {
    console.error(`Error creating ${connectionType} connection:`, error);
    throw error;
  }
}

// Helper function to validate referenced actions
const validateReferencedActions = (actionIds: string[] = [], definition: any): string[] => {
  if (!actionIds || !Array.isArray(actionIds)) {
    return [];
  }

  return actionIds.filter((id) => {
    const exists = id && definition.actions && definition.actions[id];
    if (!exists) {
      console.warn(`Warning: Referenced action '${id}' does not exist in the workflow definition`);
    }
    return exists;
  });
};

const getActionOriginalNames = (actionIds: string[] = [], definition: any): string[] => {
  if (!actionIds || !Array.isArray(actionIds)) {
    return [];
  }

  return actionIds.map((id) => {
    const action = definition.actions[id];

    if (action?.metadata?.actionType == "knowledgebase") {
      return action?.inputs?.actionOriginalName || id;
    }

    return action?.inputs?.body?.actionOriginalName || id;
  });
};

export const addWorkflowAction = async (
  workflowId: string,
  workflowName: string,
  userId: string | null,
  actionName: string,
  originalName: string,
  actionConfig: {
    type: "ApiConnection" | "Http" | "Function" | "Compose";
    actionType: string;
    resultType?: string;
    metadata: Record<string, any>;
    connectionType?: string;
    parameters?: Record<string, any>;
    method?: string;
    path?: string;
    uri?: string;
    functionApp?: {
      id: string;
    };
    referenceActions?: string[];
  },
  previousNodeId?: string | null,
  nextNodeId?: string | null,
): Promise<void> => {
  try {
    const workflowUUID = extractLastUuid(workflowId) ?? "";

    if (actionConfig.type === "ApiConnection") {
      await checkAndCreateConnection(actionConfig.connectionType);
    }

    const accessToken = await getAzureAccessToken();
    const getUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;

    const workflowResponse = await axios.get(getUrl, {
      headers: getHeaders(accessToken),
    });

    const definition = workflowResponse.data.properties.definition;
    const originalWorkflow = workflowResponse.data;

    const validationResult = validateActionAddition(
      actionConfig.actionType,
      definition,
      previousNodeId,
    );

    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
    }

    // Validate previousNodeId and nextNodeId exist in the workflow
    if (previousNodeId && !definition.actions[previousNodeId]) {
      console.warn(`Warning: previousNodeId '${previousNodeId}' does not exist in workflow`);
      previousNodeId = null;
    }

    if (nextNodeId && !definition.actions[nextNodeId]) {
      console.warn(`Warning: nextNodeId '${nextNodeId}' does not exist in workflow`);
      nextNodeId = null;
    }

    let inputs: any = {};
    switch (actionConfig.type) {
      case "ApiConnection":
        inputs = {
          host: {
            connection: {
              name: `@parameters('$connections')['${actionConfig.connectionType}']['connectionId']`,
            },
          },
          method: actionConfig.method,
          // body: actionConfig.parameters,
          body: {
            workflowName,
            workflowId: workflowUUID,
            actionoOriginalName: originalName,
            userId,
          },
          path: actionConfig.path,
        };
        break;

      case "Http":
        inputs = {
          method: actionConfig.method,
          uri: actionConfig.uri,
          body: {
            workflowName,
            workflowId: workflowUUID,
            actionOriginalName: originalName,
            userId,
          },
          // body: actionConfig.parameters,
        };
        break;

      case "Compose":
        if (
          actionConfig.actionType === "knowledgebase" &&
          actionConfig.resultType === "dataPaths"
        ) {
          inputs = {
            dataPaths: actionConfig.parameters?.dataPaths || [],
            workflowName,
            actionOriginalName: originalName,
            workflowId: workflowUUID,
            userId,
          };
        } else {
          // For other Compose actions
          inputs = actionConfig.parameters || {};
        }
        break;

      case "Function":
        inputs = {
          function: {
            id: actionConfig.functionApp?.id,
          },
          // body: {
          //   ...(actionConfig.parameters || {}),
          // },
          body: {
            workflowId: workflowUUID,
            workflowName,
            actionOriginalName: originalName,
            userId,
          },
        };
        break;
    }

    const dependencyRegistry = [];
    let dependenciesIds: string[] = [];

    if (actionConfig.referenceActions && actionConfig.referenceActions.length > 0) {
      const validReferenceActions = validateReferencedActions(
        actionConfig.referenceActions,
        definition,
      );

      dependenciesIds = [...validReferenceActions];

      for (const refActionId of validReferenceActions) {
        const refAction = definition.actions[refActionId];
        const refActionType = refAction.metadata?.actionType || "";
        const refResultType = refAction.metadata?.resultType || "";

        dependencyRegistry.push({
          actionId: refActionId,
          actionType: refActionType,
          resultType: refResultType,
          dataPaths: getDataPathsForAction(refActionId, refResultType),
        });
      }
    } else if (previousNodeId && definition.actions[previousNodeId]) {
      const prevAction = definition.actions[previousNodeId];
      const prevActionType = prevAction.metadata?.actionType || "";
      const prevResultType = prevAction.metadata?.resultType || "";

      dependenciesIds = [previousNodeId];

      dependencyRegistry.push({
        actionId: previousNodeId,
        actionType: prevActionType,
        resultType: prevResultType,
        dataPaths: getDataPathsForAction(previousNodeId, prevResultType),
      });
    }

    if (actionConfig.actionType === "knowledgebase") {
      if (dependencyRegistry.length > 0) {
        inputs.dependenciesRegistry = dependencyRegistry;
      }

      inputs.dependenciesOriginalNames = getActionOriginalNames(dependenciesIds, definition);
    } else {
      if (dependencyRegistry.length > 0) {
        inputs.body.dependenciesRegistry = dependencyRegistry;
      }

      inputs.body.dependenciesOriginalNames = getActionOriginalNames(dependenciesIds, definition);
    }

    const metadata = {
      ...(actionConfig.metadata || {}),
      actionType: actionConfig.actionType,
      resultType: actionConfig.resultType,
    };

    const orderedActions: string[] = [];
    let newActions: any = {};

    if (actionConfig.referenceActions && actionConfig.referenceActions.length > 0) {
      // Validate reference actions exist
      const validReferenceActions = validateReferencedActions(
        actionConfig.referenceActions,
        definition,
      );

      const runAfter: Record<string, string[]> = {};
      for (const refActionId of validReferenceActions) {
        runAfter[refActionId] = ["Succeeded"];
      }

      newActions = {...definition.actions};
      newActions[actionName] = {
        type: actionConfig.type,
        metadata,
        inputs,
        runAfter: Object.keys(runAfter).length > 0 ? runAfter : {},
      };
    } else {
      let currentNode: string | undefined;
      const actionRunAfterMap = new Map<string, string>();

      Object.entries(definition.actions || {}).forEach(([id, action]: [string, any]) => {
        const runAfterKeys = Object.keys(action.runAfter || {});
        if (runAfterKeys.length === 0) {
          currentNode = id;
        } else {
          actionRunAfterMap.set(id, runAfterKeys[0]);
        }
      });

      while (currentNode) {
        orderedActions.push(currentNode);
        currentNode = Array.from(actionRunAfterMap.entries())
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .find(([_, runAfterId]) => runAfterId === currentNode)?.[0];
      }

      if (previousNodeId) {
        const index = orderedActions.indexOf(previousNodeId);
        if (index !== -1) {
          orderedActions.splice(index + 1, 0, actionName);
        } else {
          orderedActions.push(actionName);
        }
      } else if (nextNodeId) {
        const index = orderedActions.indexOf(nextNodeId);
        if (index !== -1) {
          orderedActions.splice(index, 0, actionName);
        } else {
          orderedActions.push(actionName);
        }
      } else {
        orderedActions.push(actionName);
      }

      orderedActions.forEach((id, index) => {
        if (id === actionName) {
          newActions[id] = {
            type: actionConfig.type,
            metadata,
            inputs,
            runAfter: index > 0 ? {[orderedActions[index - 1]]: ["Succeeded"]} : {},
          };
        } else {
          newActions[id] = {
            ...definition.actions[id],
            runAfter: index > 0 ? {[orderedActions[index - 1]]: ["Succeeded"]} : {},
          };
        }
      });
    }

    definition.actions = newActions;

    let connections = originalWorkflow.properties.parameters?.$connections?.value || {};
    if (actionConfig.type === "ApiConnection") {
      connections = {
        ...connections,
        [actionConfig.connectionType!]: {
          connectionId: `/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Web/connections/${actionConfig.connectionType}`,
          connectionName: actionConfig.connectionType,
          id: `/subscriptions/${AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Web/locations/${process.env.AZURE_REGION}/managedApis/${actionConfig.connectionType}`,
        },
      };
    }

    for (const [actionId, action] of Object.entries(definition.actions)) {
      const runAfterKeys = Object.keys((action as any).runAfter || {});
      for (const runAfterKey of runAfterKeys) {
        if (!definition.actions[runAfterKey]) {
          console.warn(
            `Removing invalid runAfter reference to '${runAfterKey}' in action '${actionId}'`,
          );
          delete (action as any).runAfter[runAfterKey];
        }
      }

      if (runAfterKeys.length > 0 && Object.keys((action as any).runAfter).length === 0) {
        (action as any).runAfter = {};
      }

      if (
        (action as any).type === "Function" &&
        (action as any).inputs?.body?.dependenciesRegistry
      ) {
        const validDependencies = ((action as any).inputs.body.dependenciesRegistry || []).filter(
          (dep: any) => dep.actionId && definition.actions[dep.actionId],
        );
        (action as any).inputs.body.dependenciesRegistry = validDependencies;
      }
    }

    const updateUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;
    await axios.put(
      updateUrl,
      {
        ...originalWorkflow,
        location: workflowResponse.data.location,
        properties: {
          definition,
          parameters: {
            $connections: {
              type: "Object",
              value: connections,
            },
          },
        },
      },
      {
        headers: getHeaders(accessToken),
      },
    );
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const updateWorkflowAction = async (
  workflowId: string,
  actionName: string,
  actionConfig: {
    type: string;
    actionType: string;
    resultType?: string;
    parameters: Record<string, any>;
  },
): Promise<void> => {
  try {
    const accessToken = await getAzureAccessToken();
    const getUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;

    const workflowResponse = await axios.get(getUrl, {headers: getHeaders(accessToken)});

    const workflow = JSON.parse(JSON.stringify(workflowResponse.data.properties.definition));
    const originalWorkflow = JSON.parse(JSON.stringify(workflowResponse.data));

    if (!workflow.actions[actionName]) {
      throw new Error(`Action '${actionName}' not found in workflow`);
    }

    const currentAction = workflow.actions[actionName];
    let updatedAction = {...currentAction};

    if (actionConfig.type === "ApiConnection" || actionConfig.type === "Http") {
      updatedAction = {
        ...updatedAction,
        inputs: {
          ...updatedAction.inputs,
          body: {
            ...updatedAction.inputs.body,
            ...actionConfig.parameters,
          },
        },
      };
    }

    if (actionConfig.type === "Compose") {
      if (actionConfig.actionType === "knowledgebase" && actionConfig.resultType === "dataPaths") {
        updatedAction = {
          ...updatedAction,
          inputs: {
            ...updatedAction.inputs,
            dataPaths: actionConfig.parameters?.dataPaths || [],
          },
        };
      } else {
        updatedAction = {
          ...updatedAction,
          inputs: actionConfig.parameters || {},
        };
      }
    } else if (actionConfig.type === "Function") {
      const currentBody = {...(updatedAction.inputs.body || {})};

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {referenceActions, ...otherParams} = actionConfig.parameters;

      updatedAction = {
        ...updatedAction,
        inputs: {
          ...updatedAction.inputs,
          body: {
            ...currentBody,
            ...otherParams,
          },
        },
      };
    }

    let referenceActionIds: string[] = [];

    referenceActionIds = actionConfig.parameters.referenceActions;
    const validReferenceActions = referenceActionIds?.filter(
      (actionId) => workflow.actions[actionId],
    );

    if (validReferenceActions && validReferenceActions?.length > 0) {
      console.warn(`No valid reference actions found among: ${referenceActionIds.join(", ")}`);
      const dependenciesRegistry = [];

      for (const actionId of validReferenceActions) {
        const depAction = workflow.actions[actionId];

        const actionType = depAction.metadata?.actionType || "";
        const resultType = depAction.metadata?.resultType || "";

        const dataPaths = getDataPathsForAction(actionId, resultType);

        dependenciesRegistry.push({
          actionId,
          actionType,
          resultType,
          dataPaths,
          metadata: {
            actionType,
            resultType,
          },
        });
      }

      updatedAction.inputs.body.dependenciesRegistry = dependenciesRegistry;

      // Get and add the original names of dependency actions
      const dependenciesOriginalNames = getActionOriginalNames(validReferenceActions, workflow);
      if (!updatedAction.inputs.body) {
        updatedAction.inputs.body = {};
      }
      updatedAction.inputs.body.dependenciesOriginalNames = dependenciesOriginalNames;

      const newRunAfter = {};
      for (const depActionId of validReferenceActions) {
        // @ts-ignore
        newRunAfter[depActionId] = ["Succeeded"];
      }

      if (Object.keys(newRunAfter).length > 0) {
        updatedAction.runAfter = newRunAfter;
      }
    }

    updatedAction.metadata = {
      ...(updatedAction.metadata || {}),
      actionType: actionConfig.actionType,
      dependencies: actionConfig.parameters.referenceActions || [],
    };

    if (actionConfig.resultType) {
      updatedAction.metadata.resultType = actionConfig.resultType;
    } else {
      const availableActions = getAvailableActions();
      const actionDef = Object.values(availableActions).find(
        (a) => a.actionType === actionConfig.actionType,
      );
      if (actionDef && actionDef.resultType) {
        updatedAction.metadata.resultType = actionDef.resultType;
      }
    }

    const bodyString = JSON.stringify(updatedAction.inputs?.body || {});
    const bodyReferences = new Set<string>();

    const pattern = /@body\('([^']+)'\)/g;
    let match;

    while ((match = pattern.exec(bodyString)) !== null) {
      const referencedActionId = match[1];
      if (referencedActionId !== actionName) {
        bodyReferences.add(referencedActionId);
      }
    }

    const runAfter = {...(updatedAction.runAfter || {})};
    let hasChanges = false;

    for (const refActionId of bodyReferences) {
      if (!workflow.actions[refActionId]) {
        console.warn(`Action ${actionName} references non-existent action ${refActionId}`);
        continue;
      }

      if (!runAfter[refActionId]) {
        runAfter[refActionId] = ["Succeeded"];
        hasChanges = true;
        console.log(
          `Added ${refActionId} to runAfter of ${actionName} because it's referenced in body`,
        );
      }
    }

    if (hasChanges) {
      updatedAction.runAfter = runAfter;

      const runAfterActionIds = Object.keys(runAfter);
      if (runAfterActionIds.length > 0) {
        const runAfterOriginalNames = getActionOriginalNames(runAfterActionIds, workflow);

        if (
          !updatedAction.inputs.body.dependenciesOriginalNames ||
          updatedAction.inputs.body.dependenciesOriginalNames.length === 0
        ) {
          updatedAction.inputs.body.dependenciesOriginalNames = runAfterOriginalNames;
        }
      }
    }

    workflow.actions[actionName] = updatedAction;

    const updatedProperties = {
      definition: workflow,
      parameters: originalWorkflow.properties.parameters,
    };

    if (!workflow.actions || Object.keys(workflow.actions).length === 0) {
      throw new Error("Invalid workflow structure: no actions found");
    }

    for (const [id, action] of Object.entries(workflow.actions)) {
      // @ts-ignore
      if (!action.type) {
        throw new Error(`Action ${id} has no type defined`);
      }
    }

    const updateUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;
    const response = await axios.put(
      updateUrl,
      {
        ...originalWorkflow,
        location: originalWorkflow.location,
        properties: updatedProperties,
      },
      {
        headers: getHeaders(accessToken),
      },
    );

    console.log(`Update successful: ${response.status}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } else {
      console.error("Error updating action:", error);
    }
    // @ts-ignore
    throw new Error(`Failed to update ${actionConfig.actionType} action: ${error.message}`);
  }
};
