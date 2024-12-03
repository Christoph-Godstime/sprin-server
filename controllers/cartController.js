const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Food = require("../models/Food");

module.exports = {
  addProductToCart: async (req, res) => {
    const userId = req.user.id;
    const {
      foodId,
      quantity,
      additives,
      instructions,
      price,
      title,
      imageUrl,
      time,
      restaurant,
    } = req.body.orderItem;

    try {
      let cart = await Cart.findOne({ userId, restaurantId: restaurant });

      if (cart) {
        // Create a unique item ID for each item
        const newItemId = new mongoose.Types.ObjectId();

        cart.items.push({
          _id: newItemId,
          foodId,
          quantity,
          additives,
          instructions,
          price,
          title,
          imageUrl,
          time,
        });

        await cart.save();
      } else {
        cart = new Cart({
          userId,
          restaurantId: restaurant,
          items: [
            {
              _id: new mongoose.Types.ObjectId(), // Create a unique ID for the first item
              foodId,
              quantity,
              additives,
              instructions,
              price,
              title,
              imageUrl,
              time,
            },
          ],
        });
        await cart.save();
      }

      // Count the number of items for the specified restaurant
      const itemCount = cart.items.length;

      // Count the total number of items in the user's cart
      const totalCount = await Cart.countDocuments({ userId });

      res.status(201).json({
        status: true,
        count: totalCount,
        restaurantItemCount: itemCount,
        message: "Item added to cart successfully",
      });
    } catch (error) {
      console.error("Error adding product to cart:", error); // Detailed logging
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateItemInCart: async (req, res) => {
    try {
      const userId = req.user.id; // Assuming the user ID is available in req.user
      const { restaurantId, itemId } = req.params;
      const {
        quantity,
        additives,
        instructions,
        price,
        title,
        imageUrl,
        time,
      } = req.body;

      // Find the cart by restaurantId and userId, and populate the restaurantId field
      const cart = await Cart.findOne({
        restaurantId: restaurantId,
        userId: userId,
      }).populate(
        "restaurantId",
        "title logoUrl address rating ratingCount openingTime closingTime"
      ); // Populate specific fields

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Find the index of the item to update
      const itemIndex = cart.items.findIndex(
        (item) => item._id.toString() === itemId.toString()
      );

      if (itemIndex === -1) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      // Update the item
      cart.items[itemIndex] = {
        ...cart.items[itemIndex].toObject(), // Convert to plain object to spread properties
        quantity:
          quantity !== undefined ? quantity : cart.items[itemIndex].quantity,
        additives:
          additives !== undefined ? additives : cart.items[itemIndex].additives,
        instructions:
          instructions !== undefined
            ? instructions
            : cart.items[itemIndex].instructions,
        price: price !== undefined ? price : cart.items[itemIndex].price,
        title: title !== undefined ? title : cart.items[itemIndex].title,
        imageUrl:
          imageUrl !== undefined ? imageUrl : cart.items[itemIndex].imageUrl,
        time: time !== undefined ? time : cart.items[itemIndex].time,
      };

      // Save the updated cart
      const updatedCart = await cart.save();

      res.status(200).json({
        cart: updatedCart,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  removeProductFromCart: async (req, res) => {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    try {
      const cart = await Cart.findOne({ userId, restaurantId });

      if (cart) {
        // Remove all items from the specified restaurant
        cart.items = [];
        await cart.save();

        const count = await Cart.countDocuments({ userId });
        res.status(200).json({
          status: true,
          cartCount: count,
          message: "All items from the restaurant removed successfully",
        });
      } else {
        res.status(404).json({
          status: false,
          message: "Cart for the specified restaurant not found",
        });
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  removeSingleItemFromRestaurant: async (req, res) => {
    const userId = req.user.id;
    const { restaurantId, itemId } = req.params;

    try {
      const cart = await Cart.findOne({ userId, restaurantId }).populate(
        "items.foodId restaurantId"
      );

      if (cart) {
        // Find and remove the specific item by its unique ID
        const itemIndex = cart.items.findIndex(
          (item) => item._id.toString() === itemId
        );

        if (itemIndex > -1) {
          // Remove the item from the array
          cart.items.splice(itemIndex, 1);
          await cart.save();

          const count = await Cart.countDocuments({ userId });
          const restaurantItemCount = cart.items.length;

          // Prepare the response with updated cart details
          const updatedCart = {
            _id: cart._id,
            userId: cart.userId,
            restaurantId: {
              _id: cart.restaurantId._id,
              closingTime: cart.restaurantId.closingTime,
              code: cart.restaurantId.code,
              coords: cart.restaurantId.coords,
              createdAt: cart.restaurantId.createdAt,
              delivery: cart.restaurantId.delivery,
              foods: cart.restaurantId.foods,
              imageUrl: cart.restaurantId.imageUrl,
              isAvailable: cart.restaurantId.isAvailable,
              location: cart.restaurantId.location,
              logoUrl: cart.restaurantId.logoUrl,
              openingTime: cart.restaurantId.openingTime,
              owner: cart.restaurantId.owner,
              pickup: cart.restaurantId.pickup,
              rating: cart.restaurantId.rating,
              ratingCount: cart.restaurantId.ratingCount,
              restaurantDoc: cart.restaurantId.restaurantDoc,
              title: cart.restaurantId.title,
              updatedAt: cart.restaurantId.updatedAt,
              verification: cart.restaurantId.verification,
              verificationMessage: cart.restaurantId.verificationMessage,
            },
            items: cart.items.map((item) => ({
              _id: item._id,
              foodId: {
                _id: item.foodId._id,
                imageUrl: item.foodId.imageUrl,
                title: item.foodId.title,
                restaurant: item.foodId.restaurant,
                rating: item.foodId.rating,
                ratingCount: item.foodId.ratingCount,
                description: item.foodId.description,
              },
              quantity: item.quantity,
              additives: item.additives,
              instructions: item.instructions,
              price: item.price,
              title: item.title,
              imageUrl: item.imageUrl,
              time: item.time,
            })),
          };

          res.status(200).json({
            status: true,
            cartCount: count,
            restaurantItemCount: restaurantItemCount,
            cart: updatedCart,
            message: "Item removed successfully",
          });
        } else {
          res
            .status(404)
            .json({ status: false, message: "Item not found in the cart" });
        }
      } else {
        res.status(404).json({
          status: false,
          message: "Cart for the specified restaurant not found",
        });
      }
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  fetchUserCart: async (req, res) => {
    const userId = req.user.id;

    try {
      // Find all carts for the user
      const userCarts = await Cart.find({ userId })
        .populate({
          path: "items.foodId",
          select: "rating ratingCount imageUrl title restaurant description",
        })
        .populate({
          path: "restaurantId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime foods pickup delivery owner isAvailable verification verificationMessage code distance location coords imageUrl", // Adjust the fields you need
        });

      // Find carts with no items and delete them
      const emptyCartIds = userCarts
        .filter((cart) => cart.items.length === 0)
        .map((cart) => cart._id);

      if (emptyCartIds.length > 0) {
        await Cart.deleteMany({ _id: { $in: emptyCartIds } });
      }

      // Fetch the remaining carts for the user after deletion
      const remainingCarts = await Cart.find({ userId })
        .populate({
          path: "items.foodId",
          select: "rating ratingCount imageUrl title restaurant description",
        })
        .populate({
          path: "restaurantId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime foods pickup delivery owner isAvailable verification verificationMessage code distance location coords imageUrl", // Adjust the fields you need
        });

      // Map through the remaining carts to format the response
      const formattedCarts = remainingCarts.map((cart) => {
        return {
          _id: cart._id,
          userId: cart.userId,
          restaurantId: {
            _id: cart.restaurantId._id,
            title: cart.restaurantId.title,
            logoUrl: cart.restaurantId.logoUrl,
            address: cart.restaurantId.coords.address,
            rating: cart.restaurantId.rating,
            ratingCount: cart.restaurantId.ratingCount,
            openingTime: cart.restaurantId.openingTime,
            closingTime: cart.restaurantId.closingTime,
            foods: cart.restaurantId.foods,
            pickup: cart.restaurantId.pickup,
            delivery: cart.restaurantId.delivery,
            owner: cart.restaurantId.owner,
            isAvailable: cart.restaurantId.isAvailable,
            verification: cart.restaurantId.verification,
            verificationMessage: cart.restaurantId.verificationMessage,
            code: cart.restaurantId.code,
            distance: cart.restaurantId.distance,
            location: cart.restaurantId.location,
            coords: cart.restaurantId.coords,
            imageUrl: cart.restaurantId.imageUrl,
          },
          items: cart.items.map((item) => ({
            _id: item._id, // Unique ID for each item
            foodId: {
              _id: item.foodId._id,
              imageUrl: item.foodId.imageUrl,
              title: item.foodId.title,
              restaurant: item.foodId.restaurant,
              rating: item.foodId.rating,
              ratingCount: item.foodId.ratingCount,
              description: item.foodId.description,
            },
            quantity: item.quantity,
            additives: item.additives,
            instructions: item.instructions,
            price: item.price,
            title: item.title,
            imageUrl: item.imageUrl,
            time: item.time,
          })),
        };
      });

      res.status(200).json({ status: true, cart: formattedCarts });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getCartItemsByRestaurant: async (req, res) => {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    try {
      // Find the cart for the user and restaurant
      const cart = await Cart.findOne({ userId, restaurantId })
        .populate({
          path: "items.foodId",
          select: "rating ratingCount imageUrl title restaurant description",
        })
        .populate({
          path: "restaurantId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime foods pickup delivery owner isAvailable verification verificationMessage code distance location coords imageUrl",
        });

      if (!cart) {
        return res.status(404).json({
          status: false,
          message: "Cart for the specified restaurant not found",
        });
      }

      // Format the response
      const formattedCart = {
        _id: cart._id,
        userId: cart.userId,
        restaurantId: {
          _id: cart.restaurantId._id,
          title: cart.restaurantId.title,
          logoUrl: cart.restaurantId.logoUrl,
          address: cart.restaurantId.coords.address,
          rating: cart.restaurantId.rating,
          ratingCount: cart.restaurantId.ratingCount,
          openingTime: cart.restaurantId.openingTime,
          closingTime: cart.restaurantId.closingTime,
          foods: cart.restaurantId.foods,
          pickup: cart.restaurantId.pickup,
          delivery: cart.restaurantId.delivery,
          owner: cart.restaurantId.owner,
          isAvailable: cart.restaurantId.isAvailable,
          verification: cart.restaurantId.verification,
          verificationMessage: cart.restaurantId.verificationMessage,
          code: cart.restaurantId.code,
          distance: cart.restaurantId.distance,
          location: cart.restaurantId.location,
          coords: cart.restaurantId.coords,
          imageUrl: cart.restaurantId.imageUrl,
        },
        items: cart.items.map((item) => ({
          _id: item._id,
          foodId: {
            _id: item.foodId._id,
            imageUrl: item.foodId.imageUrl,
            title: item.foodId.title,
            restaurant: item.foodId.restaurant,
            rating: item.foodId.rating,
            ratingCount: item.foodId.ratingCount,
            description: item.foodId.description,
          },
          quantity: item.quantity,
          additives: item.additives,
          instructions: item.instructions,
          price: item.price,
          title: item.title,
          imageUrl: item.imageUrl,
          time: item.time,
        })),
      };

      res.status(200).json({ status: true, cart: formattedCart });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  clearUserCart: async (req, res) => {
    const userId = req.user.id;

    try {
      await Cart.deleteMany({ userId });
      res
        .status(200)
        .json({ status: true, message: "Cart cleared successfully" });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getCartCount: async (req, res) => {
    const userId = req.user.id;

    try {
      const count = await Cart.countDocuments({ userId });
      res.status(200).json({ status: true, cartCount: count });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  decrementProductQuantity: async (req, res) => {
    const userId = req.user.id;
    const productId = req.body.productId;

    try {
      const cartItem = await Cart.findOne({ userId, productId });

      if (cartItem) {
        // Calculate the price of a single product
        const productPrice = cartItem.totalPrice / cartItem.quantity;

        // If quantity is more than 1, decrement and adjust price
        if (cartItem.quantity > 1) {
          cartItem.quantity -= 1;
          cartItem.totalPrice -= productPrice;
          await cartItem.save();
          res.status(200).json({
            status: true,
            message: "Product quantity decreased successfully",
          });
        }
        // If quantity is 1, remove the item from the cart
        else {
          await Cart.findOneAndDelete({ userId, productId });
          res
            .status(200)
            .json({ status: true, message: "Product removed from cart" });
        }
      } else {
        res
          .status(404)
          .json({ status: false, message: "Product not found in cart" });
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },
};
