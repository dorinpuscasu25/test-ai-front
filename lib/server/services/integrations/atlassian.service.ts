import axios from "axios";

/**
 * Exchanges the authorization code for an access token.
 * @param code - The authorization code received from Atlassian.
 * @returns The access token, refresh token, and expiration time.
 */
export async function exchangeCodeForToken(code: string) {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_ATLASSIAN_REDIRECT_URI;

  try {
    const response = await axios.post("https://auth.atlassian.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const {access_token, refresh_token, expires_in} = response.data;

    return {accessToken: access_token, refreshToken: refresh_token, expiresIn: expires_in};
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw new Error("Failed to exchange code for token.");
  }
}

/**
 * Fetches the first accessible resource ID using the provided access token.
 * @param accessToken - The access token for authentication with Atlassian API.
 * @returns A Promise that resolves to the first resource ID or null if no resources are found.
 */
export async function getAtlassianCloudId(accessToken: string): Promise<string | null> {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    const response = await axios.get("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers,
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0].id; // Returnează ID-ul primului element
    }

    return null;
  } catch (error: unknown) {
    console.error("Error fetching accessible resources:", (error as Error).message);
    throw new Error("Failed to fetch accessible resources.");
  }
}
