export const formatDate = (date: string | null) => {
  try {
    return date ? new Date(date).toLocaleString() : "N/A";
  } catch {
    return "N/A";
  }
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

export const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return "N/A";
  if (key === "lastActivityAt") return formatDate(value as string);
  if (
    key === "totalFileSize" ||
    key === "imageFileSize" ||
    key === "documentFileSize" ||
    key === "otherFileSize"
  )
    return formatFileSize(value as number);
  if (Array.isArray(value)) return value.join(", ");
  if (key.startsWith("avg") && typeof value === "number") return formatNumber(value);
  return String(value);
};

export const formatTitle = (key: string): string => {
  return key
    .replace(/(\d+)/g, " $1")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
};

export const calculateFileTypePercentages = (
  imageFileSize: number,
  documentFileSize: number,
  otherFileSize: number,
) => {
  const totalSize = imageFileSize + documentFileSize + otherFileSize;
  if (totalSize === 0) return {images: 0, documents: 0, others: 0};

  return {
    images: Math.round((imageFileSize / totalSize) * 100),
    documents: Math.round((documentFileSize / totalSize) * 100),
    others: Math.round((otherFileSize / totalSize) * 100),
  };
};

export const getFileTypeDistribution = (analytics: any) => {
  const {imageFileSize, documentFileSize, otherFileSize} = analytics;
  const percentages = calculateFileTypePercentages(
    imageFileSize || 0,
    documentFileSize || 0,
    otherFileSize || 0,
  );

  return [
    {type: "Images", percentage: percentages.images, size: imageFileSize},
    {type: "Documents", percentage: percentages.documents, size: documentFileSize},
    {type: "Others", percentage: percentages.others, size: otherFileSize},
  ];
};
