const Item = require("../models/itemsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");

const storage = new GridFsStorage({
  url: process.env.DATABASE_LOCAL,
  file: (req, file) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      return {
        bucketName: "images",
        filename: `${Date.now()}_${file.originalname}`,
      };
    }
  },
});

const upload = multer({ storage });

exports.uploadImages = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "decorationImages", maxCount: 10 },
  { name: "bestWork", maxCount: 10 },
]);

const getImages = async (image) => {
  try {
    const { db } = mongoose.connection;
    const imageBucket = new GridFSBucket(db, { bucketName: "images" });

    const filenames = image;

    if (!filenames.length) {
      return;
    }
    const imagePromises = filenames.map((filename) => {
      return new Promise((resolve, reject) => {
        const imageData = [];
        const downloadStream = imageBucket.openDownloadStreamByName(filename);

        downloadStream.on("data", function(data) {
          imageData.push(data);
        });

        downloadStream.on("error", function() {
          reject(new AppError(`${filename}, error: "Image not found" `), 400);
        });

        downloadStream.on("end", () => {
          resolve({
            filename,
            data: Buffer.concat(imageData).toString("base64"),
          });
        });
      });
    });

    const images = await Promise.all(imagePromises.map((p) => p.catch((e) => e)));

    const successfulImages = images.filter((image) => image.data);
    const failedImages = images.filter((image) => image.error);
    return successfulImages;
  } catch (error) {
    console.log(error);
  }
};

exports.createItems = catchAsync(async (req, res, next) => {
  const imageFiles = req.files.images ? req.files?.images?.map((file) => file.filename) : [];
  const decorationFiles = req.files.decorationImages
    ? req?.files?.decorationImages?.map((file) => file.filename)
    : [];

  if (decorationFiles.length > 0) req.body.decorationImages = decorationFiles;

  if (imageFiles.length > 0) req.body.images = imageFiles;

  const newItem = new Item(req.body);
  await newItem.save();
  res.status(201).json({
    message: "success",
    newItem,
  });
});

exports.deleteItem = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const deletedData = await Item.findOneAndDelete({ _id: id });
  if (!deletedData) {
    return next(new AppError("Not found", 404));
  }
  res.status(200).json({ message: "Deleted successfull" });
});

exports.editItem = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  console.log(id);
  console.log(req.body);

  const imageFiles = req.files.images ? req.files.images.map((file) => file.filename) : [];
  const decorationFiles = req.files.decorationImages
    ? req.files.decorationImages.map((file) => file.filename)
    : [];

  if (decorationFiles.length > 0) req.body.decorationImages = decorationFiles;
  if (imageFiles.length > 0) req.body.images = imageFiles;

  const updatedItem = await Item.findOneAndUpdate({ _id: id }, req.body, { new: true });

  if (!updatedItem) {
    return next(new AppError("Not found", 404));
  }
  res.status(201).json({ message: "Edited successful", updatedItem });
});

exports.getItemsByType = catchAsync(async (req, res, next) => {
  const typeId = req.params.typeId;
  const items = await Item.find({ typeId });
  res.status(200).json({
    message: "Success",
    items,
  });
});

exports.getItem = catchAsync(async (req, res, next) => {
  // Fetch items without populating typeId
  const items = await Item.find();

  // Helper function to fetch images
  const fetchImages = async (item) => {
    try {
      const images = await getImages(item.images);
      return { ...item.toObject(), images };
    } catch (error) {
      console.error(`Error fetching images for item ${item._id}:`, error);
      return item.toObject();
    }
  };

  // Group items by typeId
  const groupedItems = {};

  // Process each item
  for (let item of items) {
    const typeId = item.typeId.toString();
    if (!groupedItems[typeId]) {
      groupedItems[typeId] = [];
    }
    const updatedItem = await fetchImages(item);
    groupedItems[typeId].push(updatedItem);
  }

  res.status(200).json({
    message: "Success",
    items: groupedItems,
  });
});

exports.getSingleItemById = catchAsync(async (req, res, next) => {
  const itemId = req.params.itemId;
  const item = await Item.findById(itemId);
  if (!item) return next(new AppError("Item not found", 404));

  const images = await getImages(item.images);
  const decorationImages = await getImages(item.decorationImages);

  res
    .status(200)
    .json({ message: "success", item: item, images: images, decorationImages: decorationImages });
});

// Get item by userId
exports.getItemByUserId = async (req, res, next) => {
  try {
    const Items = await Item.find({ clientId: req.params.userId });

    let items = [];

    for (let i = 0; i < Items.length; i++) {
      let img = await getImages(Items[i].images);
      items.push({
        item: Items[i],
        image: img,
      });
    }
    res.status(200).json({ items });
  } catch (error) {
    console.error("Error:", error);
    next(error);
  }
};
