const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Food = require("../models/Food");

module.exports = {
  addProductToCart: async (req, res) => {
    const userId = req.user.id;
    const {
      productId, // Food or Grocery ID
      itemType, // "Food" or "Grocery"
      quantity,
      additives,
      instructions,
      price,
      title,
      imageUrl,
      time,
      storeId, // Store ID (Restaurant or GroceryStore)
      storeType, // "Restaurant" or "GroceryStore"
    } = req.body.orderItem;

    if (!productId || !quantity || !price || !storeId || !storeType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (quantity <= 0 || price < 0) {
      return res.status(400).json({ error: "Invalid quantity or price" });
    }

    try {
      let cart = await Cart.findOne({ userId, storeId });

      if (cart) {
        const newItemId = new mongoose.Types.ObjectId();

        cart.items.push({
          _id: newItemId,
          productId,
          itemType,
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
          storeId,
          storeType,
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              productId,
              itemType,
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

      const itemCount = cart.items.length;
      const totalCount = await Cart.countDocuments({ userId });

      res.status(201).json({
        status: true,
        count: totalCount,
        storeItemCount: itemCount,
        message: "Item added to cart successfully",
      });
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateItemInCart: async (req, res) => {
    try {
      const userId = req.user.id; // Assuming the user ID is available in req.user
      const { storeId, itemId } = req.params; // Use `storeId` instead of `restaurantId` for generalization
      const {
        quantity,
        additives,
        instructions,
        price,
        title,
        imageUrl,
        time,
        itemType, // Either "Food" or "Grocery"
      } = req.body;

      // Find the cart by storeId, userId, and storeType
      const cart = await Cart.findOne({
        storeId,
        userId,
      }).populate(
        "storeId",
        "title logoUrl address rating ratingCount openingTime closingTime"
      ); // Populate specific fields

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Ensure the `storeType` and `itemType` match
      const isValidType =
        (cart.storeType === "Restaurant" && itemType === "Food") ||
        (cart.storeType === "GroceryStore" && itemType === "Grocery");

      if (!isValidType) {
        return res.status(400).json({
          message: `Invalid itemType for the given storeType: ${cart.storeType}`,
        });
      }

      // Find the index of the item to update
      const itemIndex = cart.items.findIndex(
        (item) =>
          item._id.toString() === itemId.toString() &&
          item.itemType === itemType
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
          additives !== undefined && itemType === "Food"
            ? additives
            : cart.items[itemIndex].additives, // Only update additives if itemType is "Food"
        instructions:
          instructions !== undefined && itemType === "Food"
            ? instructions
            : cart.items[itemIndex].instructions, // Only update instructions if itemType is "Food"
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
    const { storeId, itemType } = req.params; // `storeId` and `itemType` from request params

    try {
      // Find the user's cart for the specified storeId and itemType
      const cart = await Cart.findOne({
        userId,
        storeId,
        "items.itemType": itemType, // Ensure the items have the specified itemType
      });

      if (cart) {
        // Filter out items matching the itemType
        cart.items = cart.items.filter((item) => item.itemType !== itemType);

        // Save the updated cart
        await cart.save();

        // Count the total number of carts for the user
        const count = await Cart.countDocuments({ userId });

        res.status(200).json({
          status: true,
          cartCount: count,
          message: `All ${itemType} items removed from the specified store successfully`,
        });
      } else {
        res.status(404).json({
          status: false,
          message: `No cart found for the specified store and itemType (${itemType})`,
        });
      }
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while removing items from the cart",
        error: error.message,
      });
    }
  },

  removeSingleItemFromStore: async (req, res) => {
    const userId = req.user.id;
    const { storeId, itemId, itemType } = req.params; // `storeId`, `itemId`, and `itemType` from request params

    try {
      // Find the cart for the user, store, and itemType
      const cart = await Cart.findOne({
        userId,
        storeId,
        "items.itemType": itemType, // Match the specific itemType (Food or Grocery)
      }).populate("items.productId storeId");

      if (cart) {
        // Find the specific item by its unique ID
        const itemIndex = cart.items.findIndex(
          (item) => item._id.toString() === itemId
        );

        if (itemIndex > -1) {
          // Remove the item from the cart
          cart.items.splice(itemIndex, 1);
          await cart.save();

          const count = await Cart.countDocuments({ userId });
          const storeItemCount = cart.items.length;

          // Prepare the updated cart response
          const updatedCart = {
            _id: cart._id,
            userId: cart.userId,
            storeId: {
              _id: cart.storeId._id,
              ...(cart.storeType === "Restaurant"
                ? {
                    closingTime: cart.storeId.closingTime,
                    code: cart.storeId.code,
                    coords: cart.storeId.coords,
                    delivery: cart.storeId.delivery,
                    foods: cart.storeId.foods,
                    imageUrl: cart.storeId.imageUrl,
                    isAvailable: cart.storeId.isAvailable,
                    location: cart.storeId.location,
                    logoUrl: cart.storeId.logoUrl,
                    openingTime: cart.storeId.openingTime,
                    owner: cart.storeId.owner,
                    pickup: cart.storeId.pickup,
                    rating: cart.storeId.rating,
                    ratingCount: cart.storeId.ratingCount,
                    title: cart.storeId.title,
                    updatedAt: cart.storeId.updatedAt,
                    verification: cart.storeId.verification,
                    verificationMessage: cart.storeId.verificationMessage,
                  }
                : {
                    coords: cart.storeId.coords,
                    location: cart.storeId.location,
                    imageUrl: cart.storeId.imageUrl,
                    logoUrl: cart.storeId.logoUrl,
                    title: cart.storeId.title,
                    isAvailable: cart.storeId.isAvailable,
                    openingTime: cart.storeId.openingTime,
                    closingTime: cart.storeId.closingTime,
                    delivery: cart.storeId.delivery,
                  }),
            },
            items: cart.items.map((item) => ({
              _id: item._id,
              productId: {
                _id: item.productId._id,
                imageUrl: item.productId.imageUrl,
                title: item.productId.title,
                ...(itemType === "Food"
                  ? {
                      restaurant: item.productId.restaurant,
                      rating: item.productId.rating,
                      ratingCount: item.productId.ratingCount,
                      description: item.productId.description,
                    }
                  : {
                      category: item.productId.category,
                      subCategory: item.productId.subCategory,
                      quantity: item.productId.quantity,
                    }),
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
            storeItemCount: storeItemCount,
            cart: updatedCart,
            message: "Item removed successfully",
          });
        } else {
          res.status(404).json({
            status: false,
            message: "Item not found in the cart",
          });
        }
      } else {
        res.status(404).json({
          status: false,
          message: `Cart for the specified store and itemType (${itemType}) not found`,
        });
      }
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while removing the item from the cart",
        error: error.message,
      });
    }
  },

  fetchUserCart: async (req, res) => {
    const userId = req.user.id;

    try {
      // Find all carts for the user
      const userCarts = await Cart.find({ userId })
        .populate({
          path: "items.productId",
          select:
            "title imageUrl price rating ratingCount description category quantity isAvailable",
          populate: {
            path: "category",
            select: "name",
          },
        })
        .populate({
          path: "storeId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime imageUrl isAvailable verification code distance location",
        });

      // Find and delete carts with no items
      const emptyCartIds = userCarts
        .filter((cart) => cart.items.length === 0)
        .map((cart) => cart._id);

      if (emptyCartIds.length > 0) {
        await Cart.deleteMany({ _id: { $in: emptyCartIds } });
      }

      // Fetch the remaining carts after deletion
      const remainingCarts = await Cart.find({ userId })
        .populate({
          path: "items.productId",
          select:
            "title imageUrl price rating ratingCount description category quantity isAvailable",
          populate: {
            path: "category",
            select: "name",
          },
        })
        .populate({
          path: "storeId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime imageUrl isAvailable verification code distance location",
        });

      // Format the response
      const formattedCarts = remainingCarts.map((cart) => {
        const isRestaurant = cart.storeType === "Restaurant";
        return {
          _id: cart._id,
          userId: cart.userId,
          storeId: {
            _id: cart.storeId._id,
            title: cart.storeId.title,
            logoUrl: cart.storeId.logoUrl,
            address: cart.storeId.coords?.address,
            rating: cart.storeId.rating,
            ratingCount: cart.storeId.ratingCount,
            openingTime: cart.storeId.openingTime,
            closingTime: cart.storeId.closingTime,
            isAvailable: cart.storeId.isAvailable,
            verification: cart.storeId.verification,
            code: cart.storeId.code,
            distance: cart.storeId.distance,
            location: cart.storeId.location,
            imageUrl: cart.storeId.imageUrl,
          },
          storeType: cart.storeType,
          items: cart.items.map((item) => ({
            _id: item._id, // Unique ID for each item
            productId: {
              _id: item.productId._id,
              title: item.productId.title,
              imageUrl: item.productId.imageUrl,
              price: item.productId.price,
              rating: item.productId.rating || null,
              ratingCount: item.productId.ratingCount || null,
              description: item.productId.description || null,
              category: item.productId.category?.name || null,
              quantity: item.productId.quantity || null,
              isAvailable: item.productId.isAvailable,
            },
            itemType: item.itemType,
            quantity: item.quantity,
            additives: isRestaurant ? item.additives : undefined, // Only for restaurants
            instructions: isRestaurant ? item.instructions : undefined, // Only for restaurants
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

  getCartItemsByStore: async (req, res) => {
    const userId = req.user.id;
    const { storeId } = req.params;

    try {
      const cart = await Cart.findOne({ userId, storeId })
        .populate({
          path: "items.productId",
          select:
            "title imageUrl price quantity category subCategory rating ratingCount groceryStore restaurant",
          populate: {
            path: "category",
            select: "title",
          },
        })
        .populate({
          path: "storeId",
          select:
            "title logoUrl coords rating ratingCount openingTime closingTime foods pickup delivery owner isAvailable verification verificationMessage code distance location coords imageUrl",
        });

      if (!cart) {
        return res.status(404).json({
          status: false,
          message: "Cart for the specified store not found",
        });
      }

      const isRestaurant = cart.storeType === "Restaurant";

      // Format the store details
      const formattedStore = {
        _id: cart.storeId._id,
        title: cart.storeId.title,
        logoUrl: cart.storeId.logoUrl,
        address: cart.storeId.coords?.address || null,
        rating: cart.storeId.rating,
        ratingCount: cart.storeId.ratingCount,
        openingTime: cart.storeId.openingTime,
        closingTime: cart.storeId.closingTime,
        foods: isRestaurant ? cart.storeId.foods : undefined,
        pickup: cart.storeId.pickup,
        delivery: cart.storeId.delivery,
        owner: cart.storeId.owner,
        isAvailable: cart.storeId.isAvailable,
        verification: cart.storeId.verification,
        verificationMessage: cart.storeId.verificationMessage,
        code: cart.storeId.code,
        distance: cart.storeId.distance,
        location: cart.storeId.location,
        coords: cart.storeId.coords,
        imageUrl: cart.storeId.imageUrl,
        storeType: isRestaurant ? "Restaurant" : "GroceryStore",
      };

      // Format the cart items
      const formattedItems = cart.items.map((item) => ({
        _id: item._id,
        productId: {
          _id: item.productId._id,
          title: item.productId.title,
          imageUrl: item.productId.imageUrl,
          price: item.productId.price,
          ...(isRestaurant
            ? {
                rating: item.productId.rating,
                ratingCount: item.productId.ratingCount,
                restaurant: item.productId.restaurant, // Restaurant-specific data
              }
            : {
                quantity: item.productId.quantity,
                category: item.productId.category?.title || null,
                subCategory: item.productId.subCategory || null,
                groceryStore: item.productId.groceryStore,
              }),
        },
        quantity: item.quantity,
        additives: item.additives,
        instructions: item.instructions,
        price: item.price,
        title: item.title,
        imageUrl: item.imageUrl,
        time: item.time,
      }));

      const formattedCart = {
        _id: cart._id,
        userId: cart.userId,
        storeId: formattedStore,
        items: formattedItems,
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
