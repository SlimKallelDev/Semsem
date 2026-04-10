const listeners = new Set();

export const emitNotificationsUpdated = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Notification listener error:", error);
    }
  });
};

export const subscribeNotificationsUpdated = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
