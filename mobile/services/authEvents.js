const listeners = new Set();

export const emitAuthExpired = (message = "Session expired") => {
  listeners.forEach((listener) => {
    try {
      listener(message);
    } catch (error) {
      console.error("Auth listener error:", error);
    }
  });
};

export const subscribeAuthExpired = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

