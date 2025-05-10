import {azureBlobClient} from "@/config/database/connection/azure-blob.connection";
import prisma from "@/config/database/connection/sql.connection";
import {RestError} from "@azure/storage-blob";


export function sanitizeContainerName(name: string): string {
  // Azure container naming rules:
  // 1. Container names must be lowercase
  // 2. Container names must start with a letter or number
  // 3. Container names can only contain letters, numbers, and the dash (-) character
  // 4. Every dash (-) character must be immediately preceded and followed by a letter or number
  // 5. All letters must be lowercase
  // 6. Container names must be from 3 through 63 characters long

  // First, convert to lowercase
  let sanitized = name.toLowerCase();

  sanitized = sanitized.replace(/[^a-z0-9-]/g, "");

  sanitized = sanitized.replace(/-+/g, "-");

  sanitized = sanitized.replace(/^-+/, "");

  sanitized = sanitized.replace(/-+$/, "");

  if (sanitized.length < 3) {
    sanitized = sanitized.padEnd(3, "x");
  }

  if (sanitized.length > 63) {
    sanitized = sanitized.substring(0, 63);
  }

  return sanitized;
}

export const getFullBlobUrl = (containerName: string, blobPath: string): string => {
  const storageAccountUrl = azureBlobClient.url;
  return `${storageAccountUrl}/${containerName}/${blobPath}`;
};

export const ensureUserContainer = async (containerName: string): Promise<void> => {
  const containerClient = azureBlobClient.getContainerClient(containerName);

  try {
    const createResponse = await containerClient.createIfNotExists();
    if (createResponse.succeeded) {
      console.log(`Container "${containerName}" was created successfully.`);
    } else {
      console.log(`Container "${containerName}" already exists.`);
    }
  } catch (error: unknown) {
    if (error instanceof RestError && error.statusCode === 409) {
      console.log(`Container "${containerName}" already exists. No action needed.`);
      return;
    }
    console.error(`Azure Blob Storage error while creating container: ${error}`);
    throw new Error(`Error ensuring container for user: ${error}`);
  }
};

export async function listAllBlobs(containerName: string) {
  const containerClient = azureBlobClient.getContainerClient(containerName);
  const blobs = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    blobs.push(blob);
  }

  return blobs;
}

export async function copyBlobToNewContainer(
  sourceContainer: string,
  destinationContainer: string,
  blobName: string,
) {
  const sourceContainerClient = azureBlobClient.getContainerClient(sourceContainer);
  const destinationContainerClient = azureBlobClient.getContainerClient(destinationContainer);

  const sourceBlobClient = sourceContainerClient.getBlobClient(blobName);
  const destinationBlobClient = destinationContainerClient.getBlobClient(blobName);

  const sourceUrl = sourceBlobClient.url;
  const copyPoller = await destinationBlobClient.beginCopyFromURL(sourceUrl);
  await copyPoller.pollUntilDone();

  console.log(`Copied blob ${blobName} from ${sourceContainer} to ${destinationContainer}`);
}

export async function deleteContainer(containerName: string) {
  const containerClient = azureBlobClient.getContainerClient(containerName);
  await containerClient.delete();
  console.log(`Container ${containerName} deleted`);
}

export async function renameUserContainer(oldName: string, newName: string): Promise<void> {
  try {
    await ensureUserContainer(newName);

    const blobs = await listAllBlobs(oldName);
    for (const blob of blobs) {
      await copyBlobToNewContainer(oldName, newName, blob.name);
    }

    await deleteContainer(oldName);

    console.log(`Successfully renamed container from ${oldName} to ${newName}`);
  } catch (error) {
    console.error(`Error renaming container from ${oldName} to ${newName}:`, error);
    throw new Error(`Failed to rename container from ${oldName} to ${newName}`);
  }
}

export const createEmptyFolder = async (
  containerName: string,
  folderPath: string,
): Promise<void> => {
  try {
    const containerClient = azureBlobClient.getContainerClient(containerName);

    const normalizedFolderPath = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;

    const blobClient = containerClient.getBlockBlobClient(`${normalizedFolderPath}.placeholder`);
    await blobClient.upload("", 0);

    console.log(`Empty folder "${normalizedFolderPath}" created successfully.`);
  } catch (error) {
    console.error(`Error creating empty folder "${folderPath}":`, error);
    throw new Error(`Failed to create empty folder: ${folderPath}`);
  }
};


export const deleteFileFromAzure = async (
  containerName: string,
  filePath: string,
): Promise<void> => {
  try {
    const containerClient = azureBlobClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(filePath);
    await blobClient.deleteIfExists();
    console.log(`File "${filePath}" deleted from Azure.`);
  } catch (error) {
    console.error(`Error deleting file "${filePath}" from Azure:`, error);
    throw new Error(`Failed to delete file: ${filePath}`);
  }
};

export const deleteFolderFromAzure = async (
  containerName: string,
  folderPath: string,
): Promise<void> => {
  try {
    const containerClient = azureBlobClient.getContainerClient(containerName);
    const blobs = containerClient.listBlobsFlat({prefix: folderPath});

    for await (const blob of blobs) {
      const blobClient = containerClient.getBlobClient(blob.name);
      await blobClient.deleteIfExists();
      console.log(`Blob "${blob.name}" deleted from Azure.`);
    }

    console.log(`Folder "${folderPath}" deleted from Azure.`);
  } catch (error) {
    console.error(`Error deleting folder "${folderPath}" from Azure:`, error);
    throw new Error(`Failed to delete folder: ${folderPath}`);
  }
};
