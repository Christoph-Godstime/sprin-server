const router = require("express").Router();
const addressController = require("../controllers/addressController");
const {verifyTokenAndAuthorization, verifyAdmin}= require("../middlewares/verifyToken")

// UPADATE USER
router.post("/",verifyTokenAndAuthorization, addressController.createAddress);

// DELETE USER

router.delete("/:id",verifyTokenAndAuthorization, addressController.deleteAddress);

// GET USER

router.get("/default",verifyTokenAndAuthorization, addressController.getDefaultAddress);

router.get("/all",verifyTokenAndAuthorization, addressController.getUserAddresses);

router.put("/:id",verifyTokenAndAuthorization, addressController.updateAddress);

router.patch("/default/:address",verifyTokenAndAuthorization, addressController.setDefaultAddress);



module.exports = router