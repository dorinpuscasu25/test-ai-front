import prisma from "@/config/database/connection/sql.connection";
import {User} from "@prisma/client";
import {
  ensureUserContainer,
  renameUserContainer,
  sanitizeContainerName,
} from "@/lib/server/services/azure-blob.service";
import axios from "axios";
import {SyncProvider} from "@/types/sync";
import {createFreeSubscription} from "./subscriptions/subscription.service";

export const getUserProfile = async (userId: number) => {
  try {
    return await prisma.user.findUnique({
      where: {id: userId},
    });
  } catch (error) {
    throw new Error("Failed to get user", error as Error);
  }
};

/**
 * Synchronizes the user in the database.
 * Creates the user if they do not already exist.
 *
 * @param userId - The unique ID of the user from Clerk
 */
export const syncUserWithClerk = async (userId: string): Promise<User> => {
  console.log("prisma", userId);

  try {
    let existingUser = await prisma.user.findUnique({
      where: {clerkId: userId},
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          clerkId: userId,
        },
      });

      // Create a FREE subscription for the user
      await createFreeSubscription();

      const containerName = sanitizeContainerName(`container-${userId}`);
      await ensureUserContainer(containerName);

      const updatedUser = await prisma.user.update({
        where: {clerkId: userId},
        data: {container: containerName},
      });

      return updatedUser;
    } else {
      if (!existingUser.container) {
        const containerName = sanitizeContainerName(`container-${userId}`);

        await ensureUserContainer(containerName);
        existingUser = await prisma.user.update({
          where: {clerkId: userId},
          data: {container: containerName},
        });
      } else if (existingUser.container === `container-${existingUser.id}`) {
        const oldContainerName = existingUser.container;
        const newContainerName = sanitizeContainerName(`container-${userId}`);

        await renameUserContainer(oldContainerName, newContainerName);

        existingUser = await prisma.user.update({
          where: {id: existingUser.id},
          data: {container: newContainerName},
        });
      }

      return existingUser;
    }
  } catch (error) {
    console.error("Error synchronizing user:", error);
    throw new Error("Failed to synchronize user");
  }
};

/**
 * Get the container name for a user based on their ID.
 *
 * @param userId - The ID of the user in the database.
 * @returns The name of the container or null if the user does not have one.
 */
export const getUserContainer = async (userId: number): Promise<string | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {container: true},
    });

    if (!user) {
      console.error(`User with ID ${userId} not found.`);
      return null;
    }

    return user.container;
  } catch (error) {
    console.error(`Error fetching container for user ID ${userId}:`, error);
    throw new Error("Failed to fetch user container.");
  }
};

/**
 * Saves the Atlassian token for the given user and provider.
 * @param userId - ID of the user in the database.
 * @param provider - The provider type ('jira' or 'confluence').
 * @param accessToken
 * @param refreshToken
 * @param expiresIn
 */
export const saveAtlassianTokens = async (
  userId: number,
  provider: SyncProvider,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> => {
  const expirationDate = new Date(Date.now() + expiresIn * 1000);

  const updateData: Record<string, any> = {};

  if (provider === "jira") {
    updateData.jiraToken = accessToken;
    updateData.jiraRefreshToken = refreshToken;
    updateData.jiraTokenExpiresAt = expirationDate;
  } else if (provider === "confluence") {
    updateData.confluenceToken = accessToken;
    updateData.confluenceRefreshToken = refreshToken;
    updateData.confluenceTokenExpiresAt = expirationDate;
  }

  await prisma.user.update({
    where: {id: userId},
    data: updateData,
  });
};

/**
 * Deletes the Atlassian token for the given user and provider.
 * @param userId - ID of the user in the database.
 * @param provider - The provider type ('jira' or 'confluence').
 */
export const deleteAtlassianToken = async (userId: number, provider: string): Promise<void> => {
  if (!userId || !provider) {
    throw new Error("Missing required parameters: userId or provider.");
  }

  const validProviders = ["jira", "confluence"];
  if (!validProviders.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Expected 'jira' or 'confluence'.`);
  }

  try {
    const updateData: Record<string, null> = {};
    if (provider === "jira") {
      updateData.jiraToken = null;
    } else if (provider === "confluence") {
      updateData.confluenceToken = null;
    }

    await prisma.user.update({
      where: {id: userId},
      data: updateData,
    });
  } catch (error) {
    console.error("Error deleting Atlassian token:", error);
    throw new Error("Failed to delete Atlassian token.");
  }
};

export const getValidAccessToken = async (
  userId: number,
  provider: "jira" | "confluence",
): Promise<string> => {
  const user = await prisma.user.findUnique({where: {id: userId}});

  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const tokenField = provider === "jira" ? "jiraToken" : "confluenceToken";
  const refreshTokenField = provider === "jira" ? "jiraRefreshToken" : "confluenceRefreshToken";
  const expiresAtField = provider === "jira" ? "jiraTokenExpiresAt" : "confluenceTokenExpiresAt";

  const currentToken = user[tokenField];
  const refreshToken = user[refreshTokenField];
  const expiresAt = user[expiresAtField];

  if (!currentToken || !refreshToken || !expiresAt) {
    throw new Error(`No token information found for ${provider}.`);
  }

  if (new Date() >= expiresAt) {
    const clientId = process.env.ATLASSIAN_CLIENT_ID;
    const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;

    const response = await axios.post("https://auth.atlassian.com/oauth/token", {
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const {access_token, refresh_token: newRefreshToken, expires_in} = response.data;

    await saveAtlassianTokens(userId, provider, access_token, newRefreshToken, expires_in);

    console.log("AccessToken was refreshed");

    return access_token;
  }

  return currentToken;
};
/**
 * Retrieves a user by their Clerk ID.
 * @param clerkId - The Clerk ID of the user.
 * @returns The user object or null if not found.
 */
export const getUserByClerkId = async (clerkId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {clerkId},
      select: {id: true},
    });

    return user;
  } catch (error) {
    console.error(`Error fetching user with Clerk ID ${clerkId}:`, error);
    throw new Error("Failed to fetch user");
  }
};
