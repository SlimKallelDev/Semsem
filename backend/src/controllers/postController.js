const Post = require("../models/Post");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeLocation = (location = {}) => ({
  city: location?.city?.trim?.() || "",
  country: location?.country?.trim?.() || "",
});

const createPost = async (req, res, next) => {
  try {
    const { type, title, description, image, pet_type, location } = req.body;

    const normalizedLocation = normalizeLocation(location);

    if (!normalizedLocation.country) {
      return res.status(400).json({ message: "Country is required" });
    }

    const post = await Post.create({
      user: req.user.userId,
      type,
      title,
      description,
      image,
      pet_type,
      location: normalizedLocation,
    });

    const populatedPost = await Post.findById(post._id).populate("user");

    res.status(201).json(populatedPost);
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { country, city } = req.query;
    const filter = {};

    if (country?.trim()) {
      filter["location.country"] = {
        $regex: `^${escapeRegex(country.trim())}$`,
        $options: "i",
      };
    }

    if (city?.trim()) {
      filter["location.city"] = {
        $regex: escapeRegex(city.trim()),
        $options: "i",
      };
    }

    const posts = await Post.find(filter)
      .populate("user")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("user");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

const getPostsByUser = async (req, res, next) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this post" });
    }

    const { type, title, description, image, pet_type, location } = req.body;

    if (type !== undefined) post.type = type;
    if (title !== undefined) post.title = title;
    if (description !== undefined) post.description = description;
    if (image !== undefined) post.image = image;
    if (pet_type !== undefined) post.pet_type = pet_type;

    if (location !== undefined) {
      const normalizedLocation = normalizeLocation(location);

      if (!normalizedLocation.country) {
        return res.status(400).json({ message: "Country is required" });
      }

      post.location = normalizedLocation;
    }

    const updatedPost = await post.save();
    await updatedPost.populate("user");

    res.status(200).json(updatedPost);
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    await post.deleteOne();

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  getPostsByUser,
  updatePost,
  deletePost,
};