const Event = require("../models/eventModel");
const Booking = require("../models/bookingModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const Item = require("../models/itemsModel");

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

const getEvensByCondition = async (condition) => {
  const now = new Date();

  const results = await Event.aggregate([
    {
      $match: condition,
    },
    {
      $addFields: {
        lastDate: { $arrayElemAt: ["$dates", -1] },
      },
    },
    {
      $addFields: {
        isUpcoming: { $gt: ["$lastDate", now] },
      },
    },
    {
      $lookup: {
        from: "items",
        localField: "venue",
        foreignField: "_id",
        as: "venue",
      },
    },
    {
      $lookup: {
        from: "items",
        localField: "catering",
        foreignField: "_id",
        as: "catering",
      },
    },
    {
      $lookup: {
        from: "items",
        localField: "decoration",
        foreignField: "_id",
        as: "decoration",
      },
    },
    {
      $lookup: {
        from: "items",
        localField: "photograph",
        foreignField: "_id",
        as: "photograph",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        images: 1,
        ticketPrice: 1,
        venue: { $arrayElemAt: ["$venue", 0] },
        catering: { $arrayElemAt: ["$catering", 0] },
        decoration: { $arrayElemAt: ["$decoration", 0] },
        photograph: { $arrayElemAt: ["$photograph", 0] },
        status: 1,
        rejectedBy: 1,
        dates: 1,
        isPublished: 1,
        isUpcoming: 1,
      },
    },
    {
      $group: {
        _id: null,
        upcomingEvents: {
          $push: {
            $cond: {
              if: "$isUpcoming",
              then: {
                item: "$$ROOT",
              },
              else: "$$REMOVE",
            },
          },
        },
        pastEvents: {
          $push: {
            $cond: {
              if: { $not: "$isUpcoming" },
              then: {
                item: "$$ROOT",
              },
              else: "$$REMOVE",
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        upcomingEvents: 1,
        pastEvents: 1,
      },
    },
  ]);

  const { upcomingEvents, pastEvents } = results[0] || {
    upcomingEvents: [],
    pastEvents: [],
  };

  // Fetch and assign images for each event in parallel
  const [upcomingEventsWithImages, pastEventsWithImages] = await Promise.all([
    Promise.all(
      upcomingEvents.map(async (event) => ({
        item: event.item,
        image: await getImages(event.item.images),
      })),
    ),
    Promise.all(
      pastEvents.map(async (event) => ({
        item: event.item,
        image: await getImages(event.item.images),
      })),
    ),
  ]);
  return { Upcoming: upcomingEventsWithImages, Past: pastEventsWithImages };
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
  const data = await getEvensByCondition({ isPublished: true });

  res.status(200).json({
    message: "success",
    Upcoming: data.Upcoming,
    Past: data.Past,
  });
});

exports.getAllPublishedEvents = async (req, res, next) => {
  const data = await getEvensByCondition({ isPublished: true });

  res.status(200).json(data);
};

exports.getEventsByUserId = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  const data = await getEvensByCondition({ userId: new mongoose.Types.ObjectId(userId) });

  res.status(200).json({
    message: "success",
    Upcoming: data.Upcoming,
    Past: data.Past,
  });
});

exports.getEventsByClientId = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;
  const Events = await Booking.find({ clientId }).populate("eventId");

  let events = [];
  for (let i = 0; i < Events.length; i++) {
    let img = await getImages(Events[i]?.eventId?.images);
    events.push({
      item: Events[i],
      image: img,
    });
  }
  res.status(200).json({ message: "success", events });
});

///b 669e00735ba7aee3532a8e4e
///c 669e00735ba7aee3532a8e4e

exports.confirmEvent = catchAsync(async (req, res, next) => {
  const bookingId = req.params.bookingId;
  const booking = await Booking.findById(bookingId);
  const clientId = booking.clientId;
  if (!booking) {
    return next(new AppError("No Bookings found", 404));
  }
  booking.isConfirmed = "Confirmed";
  await booking.save();

  const bookings = await Booking.find({ eventId: booking.eventId });

  const allConfirmed = bookings.every((b) => b.isConfirmed == "Confirmed");
  if (allConfirmed) {
    await Event.findByIdAndUpdate(booking.eventId, { status: "Confirmed" });
  }

  const Events = await Booking.find({ clientId }).populate("eventId");

  let events = [];
  for (let i = 0; i < Events.length; i++) {
    let img = await getImages(Events[i]?.eventId?.images);
    events.push({
      item: Events[i],
      image: img,
    });
  }

  // await Event.findByIdAndUpdate(eventId, { status: "Confirmed" });
  res.status(200).json({ message: "success", events });
});

exports.rejectEvent = catchAsync(async (req, res, next) => {
  const bookingId = req.params.bookingId;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError("No Bookings found", 404));
  }
  const clientId = booking.clientId;
  const item = await Item.findById(booking.itemId)
    .select("typeId")
    .populate("typeId");

  if (!item || !item.typeId) {
    return next(new AppError("Item type not found", 404));
  }

  const itemType = item.typeId.type;

  booking.isConfirmed = "Rejected";
  await booking.save();

  const rejectionObject = {
    id: booking.itemId,
    type: itemType, // Use the type retrieved from the populated typeId
  };

  await Event.findByIdAndUpdate(
    booking.eventId,
    {
      $addToSet: { rejectedBy: rejectionObject },
      status: "Rejected",
      isPublished: false,
    },
    { new: true },
  );

  const Events = await Booking.find({ clientId }).populate("eventId");

  let events = [];
  for (let i = 0; i < Events.length; i++) {
    let img = await getImages(Events[i]?.eventId?.images);
    events.push({
      item: Events[i],
      image: img,
    });
  }

  res.status(200).json({ message: "success", events });
});

exports.publishEvent = catchAsync(async (req, res, next) => {
  const eventId = req.params.eventId;
  const event = await Event.findByIdAndUpdate(eventId, { isPublished: true, status: "Confirmed" });
  const userId = event.userId;

  const data = await getEvensByCondition({ userId: new mongoose.Types.ObjectId(userId) });

  res.status(200).json({
    message: "success",
    Upcoming: data.Upcoming,
    Past: data.Past,
  });
});

exports.cancelEvent = catchAsync(async (req, res, next) => {
  const eventId = req.params.eventId;
  const event = await Event.findByIdAndUpdate(eventId, { isPublished: false, status: "Canceled" });
  const userId = event.userId;
  const data = await getEvensByCondition({ userId: new mongoose.Types.ObjectId(userId) });

  res.status(200).json({
    message: "success",
    Upcoming: data.Upcoming,
    Past: data.Past,
  });
});
