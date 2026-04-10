const validateRegister = (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400);
      throw new Error("Name must be at least 2 characters long");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      typeof email !== "string" ||
      !emailRegex.test(email.trim().toLowerCase())
    ) {
      res.status(400);
      throw new Error("Please provide a valid email");
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateLogin = (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      typeof email !== "string" ||
      !emailRegex.test(email.trim().toLowerCase())
    ) {
      res.status(400);
      throw new Error("Please provide a valid email");
    }

    if (typeof password !== "string" || password.trim().length === 0) {
      res.status(400);
      throw new Error("Password is required");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateObjectIdParam = (paramName = "id") => {
  return (req, res, next) => {
    try {
      const value = req.params[paramName];

      if (!value || !/^[0-9a-fA-F]{24}$/.test(value)) {
        res.status(400);
        throw new Error(`Invalid ${paramName}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const validateComment = (req, res, next) => {
  try {
    const { post, user, text } = req.body;

    if (!post || !user || !text) {
      res.status(400);
      throw new Error("post, user and text are required");
    }

    if (!/^[0-9a-fA-F]{24}$/.test(post)) {
      res.status(400);
      throw new Error("Invalid post id");
    }

    if (!/^[0-9a-fA-F]{24}$/.test(user)) {
      res.status(400);
      throw new Error("Invalid user id");
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      res.status(400);
      throw new Error("text is required");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateMessage = (req, res, next) => {
  try {
    const { conversation, sender, text } = req.body;

    if (!conversation || !sender || !text) {
      res.status(400);
      throw new Error("conversation, sender and text are required");
    }

    if (!/^[0-9a-fA-F]{24}$/.test(conversation)) {
      res.status(400);
      throw new Error("Invalid conversation id");
    }

    if (!/^[0-9a-fA-F]{24}$/.test(sender)) {
      res.status(400);
      throw new Error("Invalid sender id");
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      res.status(400);
      throw new Error("text is required");
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateRegister,
  validateLogin,
  validateObjectIdParam,
  validateComment,
  validateMessage,
};