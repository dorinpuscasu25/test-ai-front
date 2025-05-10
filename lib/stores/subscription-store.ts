import {create} from "zustand";

interface SubscriptionState {
  currentPlan: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  willCancelAt: string | null;
  subscriptionCancelledAt: string | null;
  trialDaysRemaining: number | null;
  aiCreditsUsed: number;
  aiCreditsAllowance: number;
  workflowUsed: number;
  workflowAllowance: number;
  knowbaseStorageUsed: number;
  knowbaseStorageAllowance: number;
  daysLeft: number;

  // Actions
  setSubscriptionData: (data: {
    subscriptionTier: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
    willCancelAt: string | null;
    subscriptionCancelledAt: string | null;
    aiCreditsUsed: number;
    aiCreditsAllowance: number;
    workflowUsed: number;
    workflowAllowance: number;
    knowbaseStorageUsed: number;
    knowbaseStorageAllowance: number;
    daysLeft: number;
  }) => void;
}

const initialState = {
  currentPlan: "",
  subscriptionStatus: "Active",
  stripeCustomerId: null,
  willCancelAt: null,
  subscriptionCancelledAt: null,
  trialDaysRemaining: 0,
  aiCreditsUsed: 0,
  aiCreditsAllowance: 0,
  workflowUsed: 0,
  workflowAllowance: 0,
  knowbaseStorageUsed: 0,
  knowbaseStorageAllowance: 0,
  daysLeft: 0,
};

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  ...initialState,

  setSubscriptionData: (data) =>
    set({
      currentPlan: data.subscriptionTier,
      subscriptionStatus: data.subscriptionStatus,
      stripeCustomerId: data.stripeCustomerId,
      willCancelAt: data.willCancelAt,
      subscriptionCancelledAt: data.subscriptionCancelledAt,
      aiCreditsUsed: data.aiCreditsUsed,
      aiCreditsAllowance: data.aiCreditsAllowance,
      workflowUsed: data.workflowUsed,
      workflowAllowance: data.workflowAllowance,
      knowbaseStorageUsed: data.knowbaseStorageUsed,
      knowbaseStorageAllowance: data.knowbaseStorageAllowance,
      daysLeft: data.daysLeft,
    }),
}));
