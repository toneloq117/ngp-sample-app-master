const db = require("../models");
const UserCartItem = db.userCartItem;
const UserCart = db.userCart;
const sequelize = db.sequelize;
const UserCartItemAtrribute = db.userCartItemAtrribute;
const UserCartItemPsm= db.userCartItemPsm;

/* find user cart item details by userId */
exports.findUserCartItemsByUserId = async (userId, userCartId) => {
  return await UserCartItem.findAll({
    where: { userId: userId, UserCartId: userCartId },
    include: [{ model: UserCartItemAtrribute }, { model: UserCartItemPsm}],
  });
};

/* check if there is an active userCart for the given userId */
exports.getActiveUserCartCountByUserId = async (userId) => {
  return await UserCart.count({ where: { userId: userId, isActive: true } });
};

/* create new user cart */
exports.saveUserCart = async (userCartDetail) => {
  return await UserCart.create(userCartDetail);
};

/* mark the cart a inactive */
exports.inactivateUserCart = async (userId) => {
  return await UserCart.update(
    { isActive: false },
    {
      where: {
        userId: userId,
      },
    }
  );
};

/* get pK for the active userCart by user Id */
exports.getActiveUserCartIdByUserId = async (userId) => {
  return await UserCart.findOne({ where: { userId: userId, isActive: true } });
};

/* find user cart item details by userId and productId and userCartId */
exports.findUserCartItemsByUserIdAndProductIdAndUserCartId = async (
  userId,
  productId,
  userCartId
) => {
  return await UserCartItem.findAll({
    where: { userId: userId, productId: productId, UserCartId: userCartId },
    include: [{ model: UserCartItemAtrribute }, { model: UserCartItemPsm}],
  });
};

/* save cart item details */
exports.saveUserCartItem = async (userCartDetail, userCart) => {
  const userCartItem = await UserCartItem.create(userCartDetail, {
    include: [{ model: UserCartItemAtrribute, as: "UserCartItemAtrributes" }, {model: UserCartItemPsm, as: "UserCartItemPsms" }],
  });
  return await userCart.addUserCartItem(userCartItem);
};

/* find by id and update */
exports.findByIdAndUpdateQuantity = async (id, quantity) => {
  return await UserCartItem.update(
    { quantity: quantity },
    {
      where: {
        id: id,
      },
    }
  );
};

/* update the cart item quantity */
exports.updateUserCartItemQuantity = async (userCartItemId, quantity, discountType, discountValue) => {
    return await UserCartItem.update(
      {quantity: quantity,
        discountType: discountType,
        discountValue: discountValue
      },
      {
        where: {
          id: userCartItemId,
        },
      }
    );
  };

/* find total cart quantity by user id  for active cart */
exports.getTotalItemsInCartByUserIdForActiveCart = async (userId) => {
  return await UserCart.findAll({
    where: { userId: userId, isActive: true },
    include: [
      {
        as: "UserCartItems",
        model: UserCartItem,
        attributes: [
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalItems"],
        ]
      },
    ],
    group: ["UserCart.id", "UserCartItems.id"],
  });
};

/* Delete cartItem by Id */
exports.deleteCartItemById = async (userCartId) => {
  return await UserCartItem.destroy({
    where: { id: userCartId },
    truncate: { cascade: true },
  });
};

/* Delete all cartItems */
exports.deleteAllCartItems = async (userId) => {
  return await UserCartItem.destroy({
    where: { userId: userId },
    truncate: { cascade: true },
  });
};
