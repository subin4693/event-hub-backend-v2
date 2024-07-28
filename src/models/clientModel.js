const mongoose = require("mongoose");

function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to zero
  return normalized;
}

const AvailabilitySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  isAvailable: { type: Boolean, default: true },
});

const CatererSchema = new mongoose.Schema({
  vegMenu: [{ type: String }],
  nonVegMenu: [{ type: String }],
  price: { type: Number, required: true },
});

const ClientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Type", required: true },
    workExperience: { type: Number, required: true },
    location: { type: String },
    contact: { type: String, required: true },
    qId: { type: String, required: true },
    crNo: { type: String, required: true },
    bestWork: [{ type: String }],
    description: { type: String, required: true },
    availability: [{ type: Date, set: normalizeDate }],
    catererDetails: CatererSchema,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Client", ClientSchema);
