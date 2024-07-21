const mongoose = require("mongoose");

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
    image: {
      type: String,
    },
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
    isConfirmed: {
      type: Boolean,
      default: false,
    },
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

const Event = mongoose.model("Event", decorationSchema);

module.exports = Event;
