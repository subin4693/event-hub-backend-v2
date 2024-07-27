const express = require("express");
const clientController = require("../controllers/clientController");
const itemsController = require("../controllers/itemsController");

const router = express.Router();

router
  .route("/client")
  .get(clientController.getAllClients)
  .post(itemsController.uploadImages, clientController.createClient);

router
  .route("/upload/:id")
  .post(clientController.uploadImages, clientController.updateClientPhotos);

router.route("/images/:id").get(clientController.getImages);

router
  .route("/client/:id")
  .get(clientController.getClientByID)
  .put(itemsController.uploadImages, clientController.updateClient)
  .delete(clientController.deleteClient);

router.get("/client/:clientId/bookings", clientController.clientBooked);
router.route("/clientId/:id").get(clientController.getClientByClientID);

module.exports = router;
