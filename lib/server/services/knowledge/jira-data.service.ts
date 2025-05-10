import prisma from "@/config/database/connection/sql.connection";

export const getTaskByProjectAndStatus = async (
  projectId: string,
  status: string,
): Promise<any[]> => {
  console.log(projectId, status);

  try {
    const tickets = await prisma.jiraProjectTask.findMany({
      where: {
        projectId: parseInt(projectId, 10),
        status: status,
      },
      select: {
        taskId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assignee: true,
        comments: true,
        taskJson: true,
        labels: true,
        sprint: true,
      },
    });

    const processedData = tickets.map((ticket) => ({
      id: ticket.taskId,
      title: ticket.title,
      description: ticket.description ? JSON.parse(ticket.description) : null,
      comments: ticket.comments,
      metadata: {
        status: ticket.status,
        assignee: ticket.assignee,
        priority: ticket.priority,
        labels: ticket.labels,
        sprint: ticket.sprint,
      },
    }));

    return processedData;
  } catch (error) {
    console.error(`Error get task for project with ID "${projectId}" from database:`, error);
    throw new Error(`Failed to get project tasks from database.`);
  }
};
