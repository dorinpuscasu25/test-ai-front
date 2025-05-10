export const createSecureToken = async (userId: string, securityKey: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = {
    userId,
    timestamp: Date.now(),
    nonce: Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  };

  const payload = btoa(JSON.stringify(data));

  const keyData = encoder.encode(securityKey);
  const signatureKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    {name: "HMAC", hash: "SHA-256"},
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", signatureKey, encoder.encode(payload));

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${payload}.${signatureBase64}`;
};

export const verifyToken = async (
  token: string,
  securityKey: string,
  maxTokenAge: number,
): Promise<{userId: string} | null> => {
  try {
    const [payloadBase64, signatureBase64] = token.split(".");
    if (!payloadBase64 || !signatureBase64) return null;

    const payload = JSON.parse(atob(payloadBase64));
    const {userId, timestamp} = payload;

    if (Date.now() - timestamp > maxTokenAge) return null;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(securityKey);
    const signatureKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      {name: "HMAC", hash: "SHA-256"},
      false,
      ["verify"],
    );

    const signatureArray = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      "HMAC",
      signatureKey,
      signatureArray,
      encoder.encode(payloadBase64),
    );

    return isValid ? {userId} : null;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};
