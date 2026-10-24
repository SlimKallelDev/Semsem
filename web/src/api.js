const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api";

export const apiRequest = async (
  path,
  { token, headers, body, ...options } = {}
) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || "Une erreur est survenue."
    );
    error.status = response.status;
    throw error;
  }

  return payload;
};

export { API_URL };
