const express = require("express");
const eventController = require("../controllers/eventController");
const itemsController = require("../controllers/itemsController");

const router = express.Router();

router
  .route("/")
  .post(itemsController.uploadImages, eventController.createEvent)
  .get(eventController.getAllEvents);
router
  .route("/:userId")

  .get(eventController.getEventsByUserId);

module.exports = router;
