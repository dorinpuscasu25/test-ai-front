import prisma from "@/config/database/connection/sql.connection";
import ApiError from "@/lib/server/error";
import {
  createEmptyFolder,
  deleteFileFromAzure,
  deleteFolderFromAzure,
} from "@/lib/server/services/azure-blob.service";

export const saveFolder = async (
  name: string,
  userId: number,
  containerName: string,
  uploadingFolderId: number | null,
): Promise<void> => {
  let folderPath = `${name}/`;

  if (uploadingFolderId) {
    const uploadingFolder = await prisma.userFolder.findFirst({
      where: {
        userId: userId,
        id: uploadingFolderId,
      },
    });

    if (uploadingFolder) {
      folderPath = `${uploadingFolder.path}${folderPath}`;
    }
  }

  const existingFolder = await prisma.userFolder.findFirst({
    where: {
      userId: userId,
      name: name,
      path: folderPath,
    },
  });

  if (existingFolder) {
    throw new Error(`Folder "${name}" already exists.`);
  }

  const userfolder = await prisma.userFolder.create({
    data: {
      userId: userId,
      name,
      path: folderPath,
      parentId: uploadingFolderId ? uploadingFolderId : null,
    },
  });

  if (!userfolder) throw new ApiError("Folder not created.", 400);

  await createEmptyFolder(containerName, `${folderPath}`);
};

export const getFoldersWithSubfoldersAndFiles = async (userId: number) => {
  return prisma.userFolder.findMany({
    where: {
      userId: userId,
      parentId: null,
    },
    include: {
      subfolders: {
        include: {
          subfolders: {
            include: {
              files: true,
            },
          },
          files: true,
        },
      },
      files: true,
    },
  });
};

export const getRootFiles = async (userId: number) => {
  return prisma.userFile.findMany({
    where: {
      userId: userId,
      folderId: null,
    },
  });
};

export const deleteFolderOrFileItem = async (
  itemId: number,
  type: "file" | "folder",
  containerName: string,
): Promise<void> => {
  if (type === "file") {
    const file = await prisma.userFile.findUnique({
      where: {id: itemId},
    });

    if (!file) throw new Error(`File with ID "${itemId}" not found.`);

    await deleteFileFromAzure(containerName, file.path!);
    await deleteFileFromDatabase(file.id);
  } else if (type === "folder") {
    const folder = await prisma.userFolder.findUnique({
      where: {id: itemId},
    });

    if (!folder) throw new Error(`Folder with ID "${itemId}" not found.`);

    await deleteFolderFromAzure(containerName, folder.path);
    await deleteFolderFromDatabase(folder.id);
  }
};

export const deleteFileFromDatabase = async (fileId: number): Promise<void> => {
  try {
    await prisma.userFile.delete({
      where: {
        id: fileId,
      },
    });
    console.log(`File with ID "${fileId}" deleted from database.`);
  } catch (error) {
    console.error(`Error deleting file with ID "${fileId}" from database:`, error);
    throw new Error(`Failed to delete file from database.`);
  }
};

export const deleteFolderFromDatabase = async (folderId: number): Promise<void> => {
  try {
    const folder = await prisma.userFolder.findUnique({
      where: {id: folderId},
      include: {
        subfolders: true,
        files: true,
      },
    });

    if (!folder) throw new Error(`Folder with ID "${folderId}" not found.`);

    for (const file of folder.files) {
      await deleteFileFromDatabase(file.id);
    }

    for (const subfolder of folder.subfolders) {
      await deleteFolderFromDatabase(subfolder.id);
    }

    await prisma.userFolder.delete({
      where: {
        id: folderId,
      },
    });

    console.log(`Folder with ID "${folderId}" deleted from database.`);
  } catch (error) {
    console.error(`Error deleting folder with ID "${folderId}" from database:`, error);
    throw new Error(`Failed to delete folder from database.`);
  }
};
