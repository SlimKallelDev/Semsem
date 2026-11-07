let lastReturnPath = null;

export const rememberReturnPath = (pathname) => {
  const path = String(pathname || "").trim();
  if (!path || path === "/") {
    if (path === "/") lastReturnPath = "/home";
    return;
  }

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return;
  if (/^\/(?:\(auth\)\/)?(?:login|register|forgot-password)(?:\/|$)/i.test(path)) return;

  lastReturnPath = path;
};

export const consumeReturnPath = () => {
  const path = lastReturnPath;
  lastReturnPath = null;
  return path || "/home";
};

export const normalizeReturnPath = (candidate) => {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  if (/^\/(?:\(auth\)\/)?(?:login|register|forgot-password)(?:\/|$)/i.test(path)) return null;
  return path;
};
