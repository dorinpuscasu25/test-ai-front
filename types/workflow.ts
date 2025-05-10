export interface WorkflowData {
  name: string;
  description: string;
  userId?: string;
  clerkId?: string;
}

export interface WorkflowResponse {
  id: string;
  name: string;
  description: string;
}

export interface WorkflowActionRun {
  id: string;
  name: string;
  properties: {
    startTime: string;
    endTime: string;
    status: string;
    inputsLink?: {
      uri: string;
    };
    outputsLink?: {
      uri: string;
    };
    error?: {
      code: string;
      message: string;
    };
    trackedProperties?: Record<string, any>;
  };
}

export interface WorkflowRun {
  name: string;
  id: string;
  type: string;
  properties: {
    startTime: string;
    endTime: string;
    status: string;
    correlation: {
      clientTrackingId: string;
    };
    outputs?: any;
    trigger: {
      name: string;
      type: string;
      status: string;
      startTime: string;
      endTime: string;
      inputsLink?: {
        uri: string;
      };
      outputsLink?: {
        uri: string;
      };
    };
  };
  actions?: {
    [key: string]: {
      status: string;
      startTime: string | null;
      endTime: string | null;
      inputsLink?: string;
      outputsLink?: string;
      error?: {
        code: string;
        message: string;
      };
      outputsResults?: any;
      trackedProperties?: Record<string, any>;
      definition?: any;
    };
  };
}
