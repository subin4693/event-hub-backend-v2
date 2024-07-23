const mongoose = require("mongoose");

const userDetailSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    workExperience: { type: Number, required: true },
    location: { type: String, required: true },
    contact: { type: String, required: true },
    qId: { type: String, required: true },
    profile_photo: [{ type: String, required: true }],
    description: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("userDetail", userDetailSchema);
