import {create} from "zustand";

interface WorkflowState {
  selectedNodeId: string | null;
  selectedNodeForEdit: any;
  isWorkflowHistoryOpen: boolean;
  selectedTriggerForEdit: any;
  showActionSelector: boolean;
  addNewNodeAfterNodeId: string | null;
  showTriggerPanel: boolean;
  sidebarWidth: number;
  setSelectedNodeId: (id: string | null) => void;
  setShowActionSelector: (id: any, afterNodeId: string) => void;
  setShowTriggerPanel: (value: boolean) => void;
  setSelectedNodeForEdit: (value: any) => void;
  setSelectedTriggerForEdit: (value: any) => void;
  setIsWorkflowHistoryOpen: (value: boolean) => void;
  setSidebarWidth: (value: number) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  selectedNodeId: null,
  selectedTriggerForEdit: null,
  isWorkflowHistoryOpen: false,
  showActionSelector: false,
  showTriggerPanel: false,
  addNewNodeAfterNodeId: null,
  selectedNodeForEdit: null,
  sidebarWidth: 600,
  setSelectedNodeId: (id) => set({selectedNodeId: id}),
  setShowActionSelector: (value, afterNodeId) =>
    set({showActionSelector: value, addNewNodeAfterNodeId: afterNodeId}),
  setShowTriggerPanel: (value) => set({showTriggerPanel: value}),
  setSelectedNodeForEdit: (value) => set({selectedNodeForEdit: value}),
  setSelectedTriggerForEdit: (value) => set({selectedTriggerForEdit: value}),
  setIsWorkflowHistoryOpen: (value) => set({isWorkflowHistoryOpen: value}),
  setSidebarWidth: (value) => set({sidebarWidth: value}),
}));
