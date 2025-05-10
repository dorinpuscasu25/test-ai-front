import axios from "axios";
import prisma from "@/config/database/connection/sql.connection";
import {Prisma} from "@prisma/client";

export async function syncJiraProjectAndTasks(
  userId: number,
  cloudId: string,
  accessToken: string,
  projectId: string,
) {
  try {
    const existingProject = await prisma.jiraProject.findUnique({
      where: {projectId: projectId},
    });

    const currentTime = new Date().getTime();
    const lastSyncTime = existingProject?.lastSyncAt
      ? new Date(existingProject.lastSyncAt).getTime()
      : 0;

    if (lastSyncTime && currentTime - lastSyncTime < 24 * 60 * 60 * 1000) {
      throw new Error(
        `Project ${projectId} was already synced in the last 24 hours (last synced: ${existingProject?.lastSyncAt}).`,
      );
    }

    await prisma.jiraProject.deleteMany({
      where: {projectId: projectId},
    });

    const project = await getJiraProjectWithTasks(cloudId, accessToken, projectId);
    const projectStatuses = await getJiraProjectStatuses(cloudId, accessToken, projectId);

    const statusesForPrisma = projectStatuses as unknown as Prisma.JsonArray;

    const now = new Date();

    const savedProject = await prisma?.jiraProject.upsert({
      where: {projectId: project.id},
      update: {
        name: project.name,
        key: project.key,
        userId,
        lastSyncAt: now,
        lastSyncStatus: "success",
        statuses: statusesForPrisma,
      },
      create: {
        projectId: project.id,
        name: project.name,
        key: project.key,
        lastSyncAt: now,
        lastSyncStatus: "success",
        statuses: statusesForPrisma,
        userId,
      },
    });

    if (savedProject) {
      const tasks = await getJiraTasks(cloudId, accessToken, project.id);

      for (const task of tasks) {
        const {
          id,
          fields: {summary, description, status, priority, assignee, labels, sprint, parent},
        } = task;

        const descriptionString = description ? JSON.stringify(description) : null;

        const comments = await getJiraTaskComments(cloudId, accessToken, id);

        await prisma.jiraProjectTask.upsert({
          where: {taskId: id},
          update: {
            title: summary,
            description: descriptionString,
            status: status.name,
            statusId: status.id,
            priority: priority?.name || "None",
            assignee: assignee?.displayName || null,
            labels: labels || [],
            sprint: sprint?.name || null,
            parentId: parent?.id || null,
            comments: comments || [],
            projectId: savedProject.id,
            taskJson: task,
          },
          create: {
            taskId: id,
            title: summary,
            description: descriptionString,
            status: status.name,
            priority: priority?.name || "None",
            assignee: assignee?.displayName || null,
            labels: labels || [],
            sprint: sprint?.name || null,
            parentId: parent?.id || null,
            comments: comments || [],
            projectId: savedProject.id,
            taskJson: task,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error syncing Jira projects and tasks:", error);
    throw new Error("Failed to sync Jira projects and tasks");
  }
}

export async function getJiraProjectStatuses(
  cloudId: string,
  accessToken: string,
  projectId: string,
) {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${projectId}/statuses`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const statuses = response.data.flatMap((issueType: any) =>
      issueType.statuses.map((status: any) => ({
        id: status.id,
        name: status.name,
        statusCategory: status.statusCategory.name,
        color: status.statusCategory.colorName,
        issueType: issueType.name,
      })),
    );

    return Array.from(new Map(statuses.map((s: {id: any}) => [s.id, s])).values());
  } catch (error) {
    console.error(`Error fetching statuses for project ${projectId}:`, error);
    throw new Error(`Failed to fetch statuses for project ${projectId}`);
  }
}

/**
 * Fetches a specific Jira project and its associated tasks by project ID.
 * @param cloudId - The cloud ID for the Atlassian instance.
 * @param accessToken - The access token for authentication.
 * @param projectId - The ID of the Jira project to fetch.
 * @returns A Promise that resolves to the project object with its tasks.
 */
export async function getJiraProjectWithTasks(
  cloudId: string,
  accessToken: string,
  projectId: string,
) {
  const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${projectId}`;

  try {
    // Fetch the project details
    const projectResponse = await axios.get(baseUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const project = projectResponse.data;

    return {
      ...project,
    };
  } catch (error) {
    console.error(`Error fetching Jira project with ID ${projectId}:`, error);
    throw new Error(`Failed to fetch Jira project with ID ${projectId}`);
  }
}

export async function getJiraProjects(cloudId: string, accessToken: string) {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching Jira projects:", error);
    throw new Error("Failed to fetch Jira projects");
  }
}

export async function getJiraTasks(cloudId: string, accessToken: string, projectKey: string) {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?jql=project=${projectKey}&expand=fields`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return response.data.issues;
  } catch (error) {
    console.error(`Error fetching Jira tasks for project ${projectKey}:`, error);
    throw new Error(`Failed to fetch Jira tasks for project ${projectKey}`);
  }
}

/**
 * Fetch comments for a specific Jira task.
 */
export async function getJiraTaskComments(cloudId: string, accessToken: string, taskId: string) {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${taskId}/comment`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return response.data.comments.map((comment: any) => ({
      author: comment.author.displayName,
      body: comment.body.content.map((content: any) => content.text).join(" "),
      created: comment.created,
    }));
  } catch (error) {
    console.error(`Error fetching comments for task ${taskId}:`, error);
    throw new Error(`Failed to fetch comments for task ${taskId}`);
  }
}

export const deleteProjectOrTaskItem = async (
  itemId: number,
  type: "project" | "task",
): Promise<void> => {
  if (type === "project") {
    try {
      await prisma.jiraProject.delete({
        where: {
          id: itemId,
        },
      });
      console.log(`Project with ID "${itemId}" deleted from database.`);
    } catch (error) {
      console.error(`Error deleting project with ID "${itemId}" from database:`, error);
      throw new Error(`Failed to delete project from database.`);
    }
  } else if (type === "task") {
    try {
      await prisma.jiraProjectTask.delete({
        where: {
          id: itemId,
        },
      });
      console.log(`Task with ID "${itemId}" deleted from database.`);
    } catch (error) {
      console.error(`Error deleting task with ID "${itemId}" from database:`, error);
      throw new Error(`Failed to delete task from database.`);
    }
  }
};
