const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
// const { GridFsStorage } = require("multer-gridfs-storage");
// const multer = require("multer");

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message, err.stack);
  process.exit(1);
});

dotenv.config({ path: "./src/config/config.env" });
const app = require("./app");

const DB = process.env.DATABASE_LOCAL;

// mongoose
//   .connect(DB, { serverSelectionTimeoutMS: 5000 })
//   .then(() => console.log("DB connection successful!"))
//   .catch((err) => console.error("DB connection error:", err));
mongoose
  .connect(DB, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("DB connection successful!");

    // Create GridFS bucket after connection is successful
    const connect = mongoose.connection;
    let gfs;

    connect.once("open", () => {
      gfs = new mongoose.mongo.GridFSBucket(connect.db, {
        bucketName: "images",
      });
      console.log("GridFS initialized successfully.");
    });
  })
  .catch((err) => {
    console.error("DB connection error:", err);
  });

const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
