const express = require("express");
const eventController = require("../controllers/eventController");
const itemsController = require("../controllers/itemsController");

const router = express.Router();

router
  .route("/")
  .post(itemsController.uploadImages, eventController.createEvent)
  .get(eventController.getAllEvents);
router.route("/:userId").get(eventController.getEventsByUserId);
router.route("/client/:clientId").get(eventController.getEventsByClientId);

router.route("/confirm/:bookingId").post(eventController.confirmEvent);
router.route("/reject/:bookingId").post(eventController.rejectEvent);

router.route("/publish/:eventId").post(eventController.publishEvent);
router.route("/publish/cancel/:eventId").post(eventController.cancelEvent);

module.exports = router;
