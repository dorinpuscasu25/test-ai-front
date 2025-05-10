import prisma from "@/config/database/connection/sql.connection";
import {auth} from "@clerk/nextjs/server";
import {createFreeSubscription} from "./subscription.service";

export const getUsageStats = async () => {
  try {
    const {userId} = await auth();

    if (!userId) {
      throw new Error("User not found");
    }

    const subscription = await prisma.subscription.findUnique({
      where: {clerkId: userId},
    });

    if (!subscription) {
      await createFreeSubscription();
      throw new Error("Subscription not found");
    }

    const subscriptionStats = await prisma.subscription.findUnique({
      where: {clerkId: userId},
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        aiCreditsAllowance: true,
        aiCreditsUsed: true,
        totalAiCreditsUsed: true,
        knowbaseStorageAllowance: true,
        knowbaseStorageUsed: true,
        totalKnowbaseStorageUsed: true,
        workflowAllowance: true,
        workflowUsed: true,
        totalWorkflowUsed: true,
        subscriptionCanceledAt: true,
        cancellationReason: true,
        willCancelAt: true,
        daysUntilCancellation: true,
      },
    });
    return subscriptionStats;
  } catch (error) {
    console.error(`Error getting credits usage`, error);
    throw new Error(`Failed to get credits usage`);
  }
};

export const reduceCreditsUsage = async (usageType: string, amount: number) => {
  try {
    const {userId} = await auth();

    if (!userId) {
      throw new Error("User not found");
    }

    const subscription = await prisma.subscription.findUnique({
      where: {clerkId: userId},
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (usageType === "ai") {
      await prisma.subscription.update({
        where: {clerkId: userId},
        data: {
          aiCreditsUsed: subscription.aiCreditsUsed + amount,
          totalAiCreditsUsed: subscription.totalAiCreditsUsed + amount,
        },
      });
    }

    if (usageType === "storage") {
      await prisma.subscription.update({
        where: {clerkId: userId},
        data: {
          knowbaseStorageUsed: subscription.knowbaseStorageUsed + amount,
          totalKnowbaseStorageUsed: subscription.totalKnowbaseStorageUsed + amount,
        },
      });
    }

    if (usageType === "workflow") {
      await prisma.subscription.update({
        where: {clerkId: userId},
        data: {
          workflowUsed: subscription.workflowUsed + amount,
          totalWorkflowUsed: subscription.totalWorkflowUsed + amount,
        },
      });
    }

    return subscription;
  } catch (error) {
    console.error(`Error reducing ${usageType} credits usage`, error);
    throw new Error(`Failed to reduce ${usageType} credits usage`);
  }
};
