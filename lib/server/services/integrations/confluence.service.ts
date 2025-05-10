import axios from "axios";

import prisma from "@/config/database/connection/sql.connection";

/**
 * Synchronizes spaces and pages (with their content) for a given user.
 * @param userId - The ID of the user in the local database.
 * @param cloudId - The cloud ID for the Atlassian instance.
 * @param accessToken - The access token for authentication.
 * @param spaceKeyOrId
 */
export async function syncSpaceAndPages(
  userId: number,
  cloudId: string,
  accessToken: string,
  spaceKeyOrId: string,
) {
  try {
    const existingSpace = await prisma.confluenceSpace.findUnique({
      where: {spaceKey: spaceKeyOrId},
    });

    const currentTime = new Date().getTime();
    const lastSyncTime = existingSpace?.lastSyncAt
      ? new Date(existingSpace.lastSyncAt).getTime()
      : 0;

    if (lastSyncTime && currentTime - lastSyncTime < 24 * 60 * 60 * 1000) {
      throw new Error(
        `Space ${spaceKeyOrId} was already synced in the last 24 hours (last synced: ${existingSpace?.lastSyncAt}).`,
      );
    }

    await prisma.confluenceSpace.deleteMany({
      where: {spaceKey: spaceKeyOrId},
    });

    const space = await getConfluenceSpaceWithPages(cloudId, accessToken, spaceKeyOrId);

    if (!space) {
      throw new Error(`Failed to get space with key ${spaceKeyOrId} `);
    }

    const now = new Date();

    const savedSpace = await prisma.confluenceSpace.upsert({
      where: {spaceKey: space.key},
      update: {
        name: space.name,
        status: space.status,
        type: space.type,
        lastSyncAt: now,
        lastSyncStatus: "success",
        homepageId: space._expandable.homepage,
        userId,
      },
      create: {
        cloudId,
        spaceKey: space.key,
        name: space.name,
        status: space.status,
        type: space.type,
        lastSyncAt: now,
        lastSyncStatus: "success",
        homepageId: space._expandable.homepage,
        userId,
      },
    });

    for (const page of space.pages) {
      const pageContent = await fetchPageContent(cloudId, accessToken, page.id);

      await prisma.confluenceSpacePage.upsert({
        where: {pageId: page.id},
        update: {
          title: page.title,
          status: page.status,
          content: pageContent,
          spaceId: savedSpace.id,
        },
        create: {
          pageId: page.id,
          title: page.title,
          status: page.status,
          content: pageContent,
          spaceId: savedSpace.id,
        },
      });
    }
  } catch (error) {
    console.error("Error syncing spaces and pages:", error);
    throw new Error("Failed to sync spaces and pages");
  }
}

/**
 * Fetches a specific space and its associated pages from Confluence by space ID or key.
 * @param cloudId - The cloud ID for the Atlassian instance.
 * @param accessToken - The access token for authentication.
 * @param spaceKeyOrId - The key or ID of the space to fetch.
 * @returns A Promise that resolves to the space object with its pages.
 */
export async function getConfluenceSpaceWithPages(
  cloudId: string,
  accessToken: string,
  spaceKeyOrId: string,
) {
  const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/space/${spaceKeyOrId}`;

  try {
    const spaceResponse = await axios.get(baseUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const space = spaceResponse.data;

    // Fetch pages for the specified space
    const pages = await fetchPagesForSpace(cloudId, accessToken, space.key);

    return {
      ...space,
      pages,
    };
  } catch (error) {
    console.error(`Error fetching Confluence space with ID/key ${spaceKeyOrId}:`, error);
    throw new Error(`Failed to fetch Confluence space with ID/key ${spaceKeyOrId}`);
  }
}

/**
 * Fetches content for a given page in Confluence.
 * @param cloudId - The cloud ID for the Atlassian instance.
 * @param accessToken - The access token for authentication.
 * @param pageId - The ID of the page for which to fetch content.
 * @returns A Promise that resolves to the content of the page.
 */
async function fetchPageContent(cloudId: string, accessToken: string, pageId: string) {
  const url = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/content/${pageId}?expand=body.storage`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return response.data.body.storage.value;
  } catch (error) {
    console.error(`Error fetching content for page ${pageId}:`, error);
    throw new Error(`Failed to fetch content for page ${pageId}`);
  }
}

/**
 * Fetches spaces and their associated pages from Confluence.
 * @param cloudId - The cloud ID for the Atlassian instance.
 * @param accessToken - The access token for authentication.
 * @returns A Promise that resolves to an array of spaces with their pages.
 */
export async function getConfluenceSpacesWithPages(cloudId: string, accessToken: string) {
  const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/space`;

  try {
    const spacesResponse = await axios.get(baseUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const spaces = spacesResponse.data.results;

    return await Promise.all(
      spaces.map(async (space: any) => {
        const pages = await fetchPagesForSpace(cloudId, accessToken, space.key);
        return {
          ...space,
          pages,
        };
      }),
    );
  } catch (error) {
    console.error("Error fetching Confluence spaces and pages:", error);
    throw new Error("Failed to fetch Confluence spaces and pages");
  }
}

/**
 * Fetches pages for a given space in Confluence.
 * @param cloudId - The cloud ID for the Atlassian instance.
 * @param accessToken - The access token for authentication.
 * @param spaceKey - The key of the space for which to fetch pages.
 * @returns A Promise that resolves to an array of pages.
 */
async function fetchPagesForSpace(cloudId: string, accessToken: string, spaceKey: string) {
  const url = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/content?spaceKey=${spaceKey}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return response.data.results;
  } catch (error) {
    console.error(`Error fetching pages for space ${spaceKey}:`, error);
    throw new Error(`Failed to fetch pages for space ${spaceKey}`);
  }
}

export const deleteSpaceOrPageItem = async (
  itemId: number,
  type: "space" | "page",
): Promise<void> => {
  if (type === "space") {
    try {
      await prisma.confluenceSpace.delete({
        where: {
          id: itemId,
        },
      });
      console.log(`Space with ID "${itemId}" deleted from database.`);
    } catch (error) {
      console.error(`Error deleting space with ID "${itemId}" from database:`, error);
      throw new Error(`Failed to delete space from database.`);
    }
  } else if (type === "page") {
    try {
      await prisma.confluenceSpacePage.delete({
        where: {
          id: itemId,
        },
      });
      console.log(`Page with ID "${itemId}" deleted from database.`);
    } catch (error) {
      console.error(`Error deleting page with ID "${itemId}" from database:`, error);
      throw new Error(`Failed to delete page from database.`);
    }
  }
};
