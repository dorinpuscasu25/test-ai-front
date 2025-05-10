export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export const formatMimeType = (mimeType: string) => {
  const types: {[key: string]: string} = {
    "application/pdf": "pdf",
    "application/msword": "word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
    "application/vnd.ms-excel": "excel",
    "image/jpeg": "jpeg",
    "image/png": "png",
    "text/plain": "txt",
    "application/zip": "zip",
    "application/octet-stream": "otf",
  };

  return types[mimeType] || mimeType.split("/")[1];
};

export const processFileEntry = async (entry: FileSystemEntry): Promise<any[]> => {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => {
        resolve([
          {
            name: entry.name,
            path: entry.fullPath,
            file,
          },
        ]);
      });
    });
  } else if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const entries: FileSystemEntry[] = await new Promise((resolve) => {
      dirReader.readEntries((result) => resolve(result));
    });

    const subEntries = await Promise.all(entries.map((subEntry) => processFileEntry(subEntry)));
    return subEntries.flat();
  }
  return [];
};

export const organizeFilesAndFolders = (files: any[]) => {
  const root = {name: "/", files: [], subfolders: new Map()};

  files.forEach(({path, file}) => {
    if (!path) {
      console.error("Missing path for file:", file.name);
      return;
    }

    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    let currentFolder = root;

    parts.forEach((part: any) => {
      if (!currentFolder.subfolders.has(part)) {
        currentFolder.subfolders.set(part, {name: part, files: [], subfolders: new Map()});
      }
      currentFolder = currentFolder.subfolders.get(part);
    });

    if (fileName && file) {
      // @ts-ignore
      currentFolder.files.push({name: fileName, file});
    }
  });

  const convertToFolderStructure = (folder: any): any => {
    return {
      name: folder.name,
      files: folder.files,
      subfolders: Array.from(folder.subfolders.values()).map(convertToFolderStructure),
    };
  };

  return convertToFolderStructure(root);
};
