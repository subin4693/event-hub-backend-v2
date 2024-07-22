const mongoose = require("mongoose");

const RejectedBySchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    ticketPrice: {
      type: Number,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    catering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    photograph: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    decoration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    status: {
      type: "String", //Booked Confirmed Rejected
      default: "Booked",
    },
    rejectedBy: [RejectedBySchema],
    dates: [
      {
        type: Date,
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
