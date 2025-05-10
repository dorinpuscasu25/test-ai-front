import {azureBlobClient} from "@/config/database/connection/azure-blob.connection";
import {getTaskByProjectAndStatus} from "@/lib/server/services/knowledge/jira-data.service";

const containerName = "jira-tickets";

export const prepareJiraActionOutput = async (
  projectId: string,
  status: string,
): Promise<string> => {
  const tickets = await getTaskByProjectAndStatus(projectId, status);

  const containerClient = azureBlobClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blobName = `${projectId}-${Date.now()}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(JSON.stringify(tickets), JSON.stringify(tickets).length);

  return blockBlobClient.url;
};
