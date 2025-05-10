import prisma from "@/config/database/connection/sql.connection";
import {auth} from "@clerk/nextjs/server";

export const createFreeSubscription = async () => {
  const {userId} = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  const subscription = await prisma.subscription.create({
    data: {
      clerkId: userId,
      subscriptionTier: "Free",
      subscriptionStatus: "Active",
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      aiCreditsAllowance: 200,
      aiCreditsUsed: 0,
      knowbaseStorageAllowance: 500 * 1000,
      knowbaseStorageUsed: 0,
      workflowAllowance: 5,
      workflowUsed: 0,
    },
  });
  if (!subscription) {
    console.error("Failed to create FREE user subscription");
  }
};
