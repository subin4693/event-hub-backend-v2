const Event = require("../models/eventModel");
const Booking = require("../models/bookingModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { default: mongoose } = require("mongoose");
const { GridFSBucket } = require("mongodb");

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

exports.createEvent = catchAsync(async (req, res, next) => {
  console.log("working fine");

  const imageFiles = req.files.images ? req.files?.images?.map((file) => file.filename) : [];

  if (imageFiles.length > 0) req.body.images = imageFiles;

  const { venue, catering, photograph, decoration } = req.body;

  const newEvent = new Event({
    userId: req.body.userId,
    name: req.body.name,
    description: req.body.description,
    images: imageFiles,
    ticketPrice: req.body.ticketPrice || 0,
    venue: venue ? JSON.parse(venue).id : undefined,
    catering: catering ? JSON.parse(catering).id : undefined,
    photograph: photograph ? JSON.parse(photograph).id : undefined,
    decoration: decoration ? JSON.parse(decoration).id : undefined,
    dates: req.body.dates || [],
  });

  await newEvent.save();

  const services = [venue, catering, photograph, decoration];
  services.map(async (service) => {
    if (JSON.parse(service).id && JSON.parse(service).clientId) {
      const id = JSON.parse(service).id;
      const clientId = JSON.parse(service).clientId;
      console.log(JSON.parse(service).id);
      console.log(JSON.parse(service).clientId);
      const book = new Booking({
        userId: req.body.userId,
        clientId: clientId,
        itemId: id,
        eventId: newEvent._id,
      });
      console.log(book);
      await book.save();
    }
  });

  // const bookings = services.map(async (service) => {
  //   if (service.clientId) {
  //     const { id, clientId } = JSON.parse(service);
  //     console.log(clientId);
  //     return Booking.create({
  //       userId: req.body.userId,
  //       clientId: clientId,
  //       serviceId: id,
  //       eventId: newEvent._id,
  //     });
  //   }
  // });

  // await Promise.all(bookings);
  console.log(newEvent);
  res.status(201).json({ message: "success", event: newEvent });
});

exports.getAllEvents = catchAsync(async (req, res, next) => {
  const Events = await Event.find({ isPublished: true }).populate(
    "venue catering decoration photograph",
  );
  console.log(Events);
  let events = [];
  for (let i = 0; i < Events.length; i++) {
    let img = await getImages(Events[i].images);
    events.push({
      item: Events[i],
      image: img,
    });
  }
  res.status(200).json({ message: "success", events });
});

exports.getEventsByUserId = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;
  const Events = await Event.find({ userId }).populate("venue catering decoration photograph");
  console.log(Events);
  let events = [];
  for (let i = 0; i < Events.length; i++) {
    let img = await getImages(Events[i].images);
    events.push({
      item: Events[i],
      image: img,
    });
  }
  res.status(200).json({ message: "success", events });
});
