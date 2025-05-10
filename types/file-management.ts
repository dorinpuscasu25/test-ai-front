export type FileType = {
  id: string;
  name: string;
  size: number;
  lastModified: Date;
  type: "file" | "folder";
  path: string;
};

export type FolderType = {
  id: string;
  name: string;
  files: FileType[];
  size: number;
  lastModified: Date;
};

