const userCartDao = require("../dao/UserCartDao");
const _ = require('lodash');

// Function to get the total number of items in the cart
async function getTotalItemsInCart(userId) {
  let totalItemsInCart = 0;

  try {
    const records =  await userCartDao.getTotalItemsInCartByUserIdForActiveCart(userId); //only for active user cart
    if (records && records.length > 0) {
      records[0].UserCartItems.forEach(userCartItem => {
        totalItemsInCart += parseInt(userCartItem.dataValues.totalItems);
      });
    }

  } catch(error) {
    console.log(`Error occurred while getting total items in cart: ${error.message}`);
  }

  return totalItemsInCart;
}


/**
 * Function to check the uniquness of a cart item
 * fields getting used currently: 1. attribute 2. PSM
 */
function isTheProductUnique(existingItemsByProductId, attributeDefinitions, 
  psmSelection) {
  let itemExistsWithSameAttributes = false;
  let itemExistsWithSamePsm = false;

  let existingProduct;

  existingItemsByProductId?.forEach(existingItemByProductId => {
      const existingItemAttributes = existingItemByProductId.UserCartItemAtrributes.map(attributeDefinition => 
        ({name: attributeDefinition.attributeName, value: attributeDefinition.attributeValue}));
      
      const existingItemPsms = existingItemByProductId.UserCartItemPsms.map(psm => ({name: psm.psmId,
        value: psm.psmName}));
      /* if attributes is undefined then it's an already existing product with no attributes */
      if (existingItemAttributes.length === 1 && !existingItemAttributes[0].name) {
        existingProduct = existingItemByProductId;
        return;
      }

      /* sorting by keys, as _isEqual is returning false with out of order keys <= find out why */
      const sortedExistingItemAttributes = _.sortBy(existingItemAttributes, ['name', 'value']);
      const sortedAttributesFromUi = _.sortBy(attributeDefinitions, ['name', 'value']);
      itemExistsWithSameAttributes = _.isEqual(sortedAttributesFromUi, sortedExistingItemAttributes);

      itemExistsWithSamePsm = _.isEqual(existingItemPsms, psmSelection);
      
      if (itemExistsWithSameAttributes && itemExistsWithSamePsm) {
        existingProduct = existingItemByProductId;
        return;
      }
  });
  return existingProduct;
}
module.exports = {getTotalItemsInCart, isTheProductUnique};