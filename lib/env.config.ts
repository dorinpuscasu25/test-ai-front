export const getConfig = () => {
  if (typeof window === "undefined") {
    return {
      AZURE_SUBSCRIPTION_ID: process.env.AZURE_SUBSCRIPTION_ID,
      AZURE_RESOURCE_GROUP: process.env.AZURE_RESOURCE_GROUP,
      AZURE_API_VERSION: "2019-05-01",
      AZURE_MANAGEMENT_API: "https://management.azure.com",
      AZURE_REGION: process.env.AZURE_REGION,
      AZURE_FUNCTION_APP_ENV: process.env.AZURE_FUNCTION_APP_ENV,
      NODE_ENV: process.env.NODE_ENV,
    };
  }

  return (window as any).__ENV || {};
};
