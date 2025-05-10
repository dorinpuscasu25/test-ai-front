import {WorkflowCreateData} from "@/types/models/prisma/Workflow";
import {getAzureAccessToken} from "@/config/azure";
import axios from "axios";
import {
  AZURE_API_VERSION,
  AZURE_MANAGEMENT_API,
  AZURE_REGION,
  AZURE_RESOURCE_GROUP,
  AZURE_SUBSCRIPTION_ID,
} from "@/lib/constants";
import {getHeaders} from "@/lib/utils";
import {saveWorkflow} from "@/lib/server/services";
import {v4 as uuidv4} from "uuid";
import {WorkflowActionRun, WorkflowRun} from "@/types";
import {logWorkflowCreation} from "@/lib/server/services/logging.service";

export const createWorkflow = async (
  workflowData: WorkflowCreateData,
  userId: string | number,
  clerkId: string,
): Promise<string> => {
  try {
    const accessToken = await getAzureAccessToken();
    const workflowName = `${uuidv4()}`;

    const payload = {
      location: AZURE_REGION || "eastus",
      properties: {
        definition: {
          $schema:
            "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
          contentVersion: "1.0.0.0",
          parameters: {
            $connections: {
              defaultValue: {},
              type: "Object",
            },
          },
          triggers: {
            manual: {
              type: "Request",
              kind: "Http",
              inputs: {
                schema: {},
              },
            },
          },
          actions: {},
        },
        parameters: {},
      },
      tags: {
        userId: clerkId,
        originalName: workflowData.title,
        description: workflowData.description,
      },
    };

    const url = `${AZURE_MANAGEMENT_API}/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Logic/workflows/${workflowName}?api-version=${AZURE_API_VERSION}`;

    const response = await axios.put(url, payload, {
      headers: getHeaders(accessToken),
    });

    await saveWorkflow(workflowData, response.data.id, Number(userId));

    await logWorkflowCreation(response.data);

    console.log("create", response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to create workflow");
  }
};

export const updateTrigger = async (
  workflowId: string,
  triggerConfig: {
    triggerType: string;
    scheduleType?: string;
    time?: string;
    dayOfWeek?: string;
  },
): Promise<void> => {
  try {
    const accessToken = await getAzureAccessToken();
    const getUrl = `${AZURE_MANAGEMENT_API}/${workflowId}?api-version=${AZURE_API_VERSION}`;

    const workflowResponse = await axios.get(getUrl, {
      headers: getHeaders(accessToken),
    });

    const workflow = workflowResponse.data;
    const definition = workflow.properties.definition;

    if (triggerConfig.triggerType === "scheduled") {
      const [hours] = (triggerConfig.time || "00:00").split(":").map(Number);

      const dayMapping: {[key: string]: string} = {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday",
      };

      const baseSchedule: any = {
        hours: [hours],
        minutes: [0],
      };

      if (triggerConfig.scheduleType === "weekly" && triggerConfig.dayOfWeek) {
        baseSchedule.weekDays = [dayMapping[triggerConfig.dayOfWeek]];
      }

      const recurrenceConfig = {
        type: "Recurrence",
        recurrence: {
          frequency: triggerConfig.scheduleType === "weekly" ? "Week" : "Day",
          interval: 1,
          schedule: baseSchedule,
          timeZone: "UTC",
        },
      };

      definition.triggers = {
        recurrence: recurrenceConfig,
      };
    } else {
      definition.triggers = {
        manual: {
          type: "Request",
          kind: "Http",
          inputs: {
            schema: {},
          },
        },
      };
    }

    const updateUrl = `${AZURE_MANAGEMENT_API}/${workflowId}?api-version=${AZURE_API_VERSION}`;
    await axios.put(
      updateUrl,
      {
        ...workflow,
        properties: {
          ...workflow.properties,
          definition,
        },
      },
      {
        headers: getHeaders(accessToken),
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to update trigger");
  }
};

export const getWorkflowDetails = async (workflowId: string) => {
  try {
    const accessToken = await getAzureAccessToken();

    const url = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;

    const response = await axios.get(url, {
      headers: getHeaders(accessToken),
    });

    const definition = response.data.properties.definition;
    const triggers = definition.triggers || {};
    const actions = definition.actions || {};

    const runsUrl = `${AZURE_MANAGEMENT_API}${workflowId}/runs?api-version=${AZURE_API_VERSION}`;
    const runsResponse = await axios.get(runsUrl, {
      headers: getHeaders(accessToken),
    });

    return {
      workflow: response.data,
      definition,
      triggers,
      actions,
      runs: runsResponse.data.value,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to get workflow details");
  }
};

export const updateWorkflow = async (
  workflowId: string,
  newName: string,
  newDescription: string,
): Promise<void> => {
  try {
    const accessToken = await getAzureAccessToken();

    const getUrl = `${AZURE_MANAGEMENT_API}/${workflowId}?api-version=${AZURE_API_VERSION}`;

    const workflowResponse = await axios.get(getUrl, {
      headers: getHeaders(accessToken),
    });

    const workflow = workflowResponse.data;

    const updateUrl = `${AZURE_MANAGEMENT_API}/${workflowId}?api-version=${AZURE_API_VERSION}`;
    await axios.put(
      updateUrl,
      {
        ...workflow,
        tags: {
          ...workflow.tags,
          originalName: newName,
          description: newDescription,
        },
      },
      {
        headers: getHeaders(accessToken),
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to update workflow name");
  }
};

export const deleteWorkflow = async (workflowId: string): Promise<void> => {
  try {
    const accessToken = await getAzureAccessToken();

    // Remove any leading slash from workflowId
    const cleanWorkflowId = workflowId.startsWith("/") ? workflowId.slice(1) : workflowId;

    const deleteUrl = `${AZURE_MANAGEMENT_API}/${cleanWorkflowId}?api-version=${AZURE_API_VERSION}`;

    await axios.delete(deleteUrl, {
      headers: getHeaders(accessToken),
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to delete workflow");
  }
};

export const runWorkflow = async (
  workflowId: string,
  triggerName: string = "manual",
  payload: any = {},
): Promise<string> => {
  try {
    const accessToken = await getAzureAccessToken();

    const triggerUrl = `${AZURE_MANAGEMENT_API}${workflowId}/triggers/${triggerName}/listCallbackUrl?api-version=${AZURE_API_VERSION}`;

    const triggerResponse = await axios.post(
      triggerUrl,
      {},
      {
        headers: getHeaders(accessToken),
      },
    );

    const callbackUrl = triggerResponse.data.value;

    const runResponse = await axios.post(callbackUrl, payload);

    const runId = runResponse.headers["x-ms-workflow-run-id"];

    return runId;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to run workflow");
  }
};

export const getWorkflowRunStatus = async (workflowId: string, runId: string) => {
  try {
    const accessToken = await getAzureAccessToken();

    const definitionUrl = `${AZURE_MANAGEMENT_API}/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Logic/workflows/${workflowId}?api-version=${AZURE_API_VERSION}`;
    const definitionResponse = await axios.get(definitionUrl, {
      headers: getHeaders(accessToken),
    });

    const workflowDefinition = definitionResponse.data.properties.definition.actions;
    const allActionIds = Object.keys(workflowDefinition);

    const runUrl = `${AZURE_MANAGEMENT_API}/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Logic/workflows/${workflowId}/runs/${runId}/actions?api-version=${AZURE_API_VERSION}`;
    const runResponse = await axios.get(runUrl, {
      headers: getHeaders(accessToken),
    });

    const runningActions = runResponse.data.value;

    const actions = allActionIds.map((actionId) => {
      const runningAction = runningActions.find((action: any) => action.name === actionId);

      if (runningAction) {
        return {
          id: actionId,
          status: runningAction.properties.status,
          startTime: runningAction.properties.startTime,
          endTime: runningAction.properties.endTime,
          inputsLink: runningAction.properties.inputsLink?.uri,
          outputsLink: runningAction.properties.outputsLink?.uri,
        };
      } else {
        const actionDefinition = workflowDefinition[actionId];
        const hasRunAfter =
          actionDefinition.runAfter && Object.keys(actionDefinition.runAfter).length > 0;

        const dependenciesStarted =
          hasRunAfter &&
          Object.keys(actionDefinition.runAfter).some((depId) =>
            runningActions.some((action: any) => action.name === depId),
          );

        return {
          id: actionId,
          status: dependenciesStarted ? "Waiting" : "NotStarted",
          startTime: null,
          endTime: null,
        };
      }
    });

    const sortedActions = actions.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    return sortedActions;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to get workflow run status");
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getWorkflowsByUserId = async (userId: string): Promise<Array<any>> => {
  const accessToken = await getAzureAccessToken();

  const graphUrl = `https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`;

  const query = {
    query: `
      Resources
      | where type == 'microsoft.logic/workflows'
      | where tags.userId == '${userId}'
    `,
  };

  const response = await axios.post(graphUrl, query, {
    headers: getHeaders(accessToken),
  });

  return response.data.data;
};

export const deleteAction = async (workflowId: string, actionName: string): Promise<void> => {
  try {
    const accessToken = await getAzureAccessToken();

    const getUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;
    const workflowResponse = await axios.get(getUrl, {
      headers: getHeaders(accessToken),
    });

    const workflowData = workflowResponse.data;
    const workflow = workflowData.properties.definition;

    if (!workflow.actions[actionName]) {
      throw new Error(`Action '${actionName}' not found in workflow`);
    }

    const actionToDelete = workflow.actions[actionName];
    const actionRunAfter = actionToDelete.runAfter || {};

    const dependentActions = Object.entries(workflow.actions).filter(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, action]: [string, any]) =>
        action.runAfter && Object.keys(action.runAfter).includes(actionName),
    );

    dependentActions.forEach(([depActionName, action]: [string, any]) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {[actionName]: _, ...remainingRunAfter} = action.runAfter;

      workflow.actions[depActionName].runAfter = {
        ...remainingRunAfter,
        ...actionRunAfter,
      };
    });

    delete workflow.actions[actionName];

    const updatePayload = {
      ...workflowData,
      properties: {
        ...workflowData.properties,
        definition: workflow,
      },
    };

    const updateUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;
    await axios.put(updateUrl, updatePayload, {
      headers: getHeaders(accessToken),
    });

    console.log(
      `Action '${actionName}' has been successfully deleted and workflow links have been preserved`,
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error(`Failed to delete action '${actionName}'`);
  }
};

export const getWorkflowRunsWithDetails = async (
  workflowId: string,
  options?: {
    top?: number;
    filter?: string;
    skipToken?: string;
    includeActionDetails?: boolean;
  },
): Promise<{
  value: WorkflowRun[];
  nextLink?: string;
}> => {
  try {
    const accessToken = await getAzureAccessToken();

    const definitionUrl = `${AZURE_MANAGEMENT_API}${workflowId}?api-version=${AZURE_API_VERSION}`;
    const definitionResponse = await axios.get(definitionUrl, {
      headers: getHeaders(accessToken),
    });
    const workflowDefinition = definitionResponse.data.properties.definition.actions || {};

    let url = `${AZURE_MANAGEMENT_API}${workflowId}/runs?api-version=${AZURE_API_VERSION}`;

    const queryParams = new URLSearchParams();
    if (options?.top) {
      queryParams.append("$top", options.top.toString());
    }
    if (options?.filter) {
      queryParams.append("$filter", options.filter);
    }
    if (options?.skipToken) {
      queryParams.append("$skipToken", options.skipToken);
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url += `&${queryString}`;
    }

    const runsResponse = await axios.get(url, {
      headers: getHeaders(accessToken),
    });

    const runs: WorkflowRun[] = runsResponse.data.value;

    if (options?.includeActionDetails) {
      await Promise.all(
        runs.map(async (run) => {
          try {
            const actionsUrl = `${AZURE_MANAGEMENT_API}${workflowId}/runs/${run.name}/actions?api-version=${AZURE_API_VERSION}`;
            const actionsResponse = await axios.get(actionsUrl, {
              headers: getHeaders(accessToken),
            });

            const runningActions: WorkflowActionRun[] = actionsResponse.data.value;
            const allActionIds = Object.keys(workflowDefinition);

            run.actions = {};

            for (const actionId of allActionIds) {
              const runningAction = runningActions.find((action) => action.name === actionId);

              if (runningAction) {
                let outputsResults = null;

                if (runningAction.properties.outputsLink?.uri) {
                  try {
                    const outputResponse = await axios.get(
                      runningAction.properties.outputsLink.uri,
                    );
                    outputsResults = outputResponse.data;
                  } catch (outputError) {
                    console.error(`Error fetching outputs for action ${actionId}:`, outputError);
                  }
                }

                run.actions![actionId] = {
                  status: runningAction.properties.status,
                  startTime: runningAction.properties.startTime,
                  endTime: runningAction.properties.endTime,
                  inputsLink: runningAction.properties.inputsLink?.uri,
                  outputsLink: runningAction.properties.outputsLink?.uri,
                  outputsResults,
                  error: runningAction.properties.error,
                  trackedProperties: runningAction.properties.trackedProperties,
                  definition: workflowDefinition[actionId],
                };
              } else {
                const actionDefinition = workflowDefinition[actionId];
                const hasRunAfter =
                  actionDefinition.runAfter && Object.keys(actionDefinition.runAfter).length > 0;

                const dependenciesStarted =
                  hasRunAfter &&
                  Object.keys(actionDefinition.runAfter).some((depId) =>
                    runningActions.some((action) => action.name === depId),
                  );

                run.actions![actionId] = {
                  status: dependenciesStarted ? "Waiting" : "NotStarted",
                  startTime: null,
                  endTime: null,
                  definition: actionDefinition,
                };
              }
            }
          } catch (error) {
            console.error(`Failed to get action details for run ${run.name}:`, error);
            run.actions = {};
          }
        }),
      );
    }

    return {
      value: runs,
      nextLink: runsResponse.data.nextLink,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", (error as Error).message);
    }
    throw new Error("Failed to get workflow runs with details");
  }
};
