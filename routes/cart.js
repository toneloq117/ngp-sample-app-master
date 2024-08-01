const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getTotalItemsInCart, isTheProductUnique} = require('../utils/cartUtils.js');
const userCartDao = require("../dao/UserCartDao");

let currencyFormatter;

// Add an item to the cart
router.post("/", async (req, res) => {
  const productCount = req.body.productCount;
  const productId = req.body.productId;
  const productName = req.body.productName;
  const productDisplayUrl = req.body.productDisplayUrl;
  const attributeDefinitions = req.body.attributeDefinitions;
  const psmSelection = req.body.psmSelection;
  const userId = req.cookies.loggedInUserId || 'GUEST';
  
  /* check if an active cart exists for this user else create a one */
  let userCartObject = await userCartDao.getActiveUserCartIdByUserId(userId);

  if (!userCartObject) {
    userCartObject = await userCartDao.saveUserCart({userId: userId});
  }
  await addProductToCart(userId, productId, productName, productDisplayUrl, productCount, attributeDefinitions, psmSelection, userCartObject);
  const totalItemsInCart = await getTotalItemsInCart(userId);
  res.status(200).json({ 'totalItemsInCart': totalItemsInCart });
});

// update item quantity in cart
router.put("/", async (req, res) => {
  const quantityMap = new Map(req.body);
  
  try{  
      const updatePromises = Array.from( quantityMap ).map(([key, value]) => {
        return userCartDao.updateUserCartItemQuantity(key, value.quantity, value.discountType==''?null:value.discountType, value.discountValue==''?null:value.discountValue);
      });
    await Promise.all(updatePromises);
    res.status(302).json({ 'success': true });
  } catch (error) {
    console.log(`Error updating cart item quantity: ${error}`);
		res.status(500).json({message: 'Internal error occurred: Unable to Reprice'});
  }
});

// Remove an item from cart
router.delete("/:userCartId", async (req, res) => {
  const userCartId = req.params.userCartId;
  await userCartDao.deleteCartItemById(userCartId);
  const userId = req.cookies.loggedInUserId || 'GUEST';
  const totalItemsInCart = await getTotalItemsInCart(userId);
  res.status(200).json({ 'totalItemsInCart': totalItemsInCart });
});

// clear whole cart
router.delete("/", async (req, res) => {
  const userId = req.cookies.loggedInUserId || 'GUEST';
  const removedUserCartItemCount = await userCartDao.deleteAllCartItems(userId);
  res.status(200).json({ 'removedUserCartItems': removedUserCartItemCount});
});

// Get the cart details
router.get("/", async (req, res) => {
	const accessToken = req.cookies.accessToken;
  const instanceUrl = req.cookies.instanceUrl;
  const userId = req.cookies.loggedInUserId || 'GUEST';
  currencyFormatter = new Intl.NumberFormat(req.acceptsLanguages()[0], { style: 'currency', currency: process.env.CURRENCY_ISO_CODE});
  const headlessPricingApi = instanceUrl + "/services/data/v59.0/connect/core-pricing/pricing";
  const catalogEpcApi =
    instanceUrl + process.env.EPC_BASE_API + "catalogs/";

  const headers = {
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  };

  /* check if an active cart exists for this user */
  let userCartObject = await userCartDao.getActiveUserCartIdByUserId(userId);

  let products = [];
  if (userCartObject) {
    products = await userCartDao.findUserCartItemsByUserId(userId, userCartObject.id); 
  }
 
	products = products ? products : [];

  let cartData = [];
  let cartTotal = 0;
  let errorMessage = '';
  
  const attributeMap = new Map();
  const psmMap = new Map();
  const netUnitPriceMap = new Map();
  const unitPriceMap = new Map();
  const waterfallMap = new Map();

  if (products.length > 0) {
    let productIndex = 0;
    const jsonDataPayloadLineItemObject = products.map(product => {
      const generalizedAttributesMap = product.UserCartItemAtrributes.map(attributeDefinition => 
        ({name: attributeDefinition.attributeName, value: attributeDefinition.attributeValue}));
      attributeMap.set(product.productId + parseInt(productIndex), generalizedAttributesMap);

      const generalizedPsmMap = product.UserCartItemPsms.map(psm => ({name: psm.psmId,
        value: psm.psmName}));
      psmMap.set(product.productId + parseInt(productIndex), generalizedPsmMap);
      const existingItemAttributes = generalizedAttributesMap;
      const psmId = product.UserCartItemPsms && product.UserCartItemPsms.length > 0 ? product.UserCartItemPsms[0].psmId : '';
      return {
        LineItemId: product.productName + parseInt(productIndex),
        ProductID: product.productId,
        id: product.productId + parseInt(productIndex++),
        ProductSellingModel: psmId,
        CurrencyIsoCode: process.env.CURRENCY_ISO_CODE,
        Quantity: parseInt(product.quantity),
        Product: existingItemAttributes,
        Account_C: req.cookies.accountId,
        MembershipStatus_C: req.cookies.accountMembershipStatus,
        Region_C: req.cookies.accountRegion,
        AdjustmentType: product.discountType,
        AdjustmentValue: product.discountValue
      };
    });

    let jsonDataPayloadObject = {
      Cart: [{
        id: userCartObject.id,
        CartItem: jsonDataPayloadLineItemObject,
        PriceBookId: process.env.PRICE_BOOK_ID
      }]
    }

    const pricingPayload = {
      "contextDefinitionId": req.cookies.contextDefinitionId,
      "contextMappingId": req.cookies.contextMappingId,
      "jsonDataString": JSON.stringify(jsonDataPayloadObject),
      "pricingProcedureId": req.cookies.pricingProcedureId,
      "configurationOverrides": {"skipWaterfall": false}
  };
  console.log(`Headless API Payload: ${JSON.stringify(pricingPayload, null, 2)}`);

    let result;
    try {
      result = await axios.post(headlessPricingApi, pricingPayload, { headers });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('Session Expired. Trying to refresh token');
        res.cookie('accessToken', '');
        res.cookie('issuedAt', '');
        res.redirect('/login/refresh');
      } else {
        errorMessage = 'Unable to price the cart. Internal error occurred.';
        console.log(`Internal error occurred ${error}`);
      };
    }

    if (result?.status === 201 && result?.data?.pricingResult) {
      // create NetUnitPrice and UnitPrice maps {id : price}
      if (result.data.pricingResult.NetUnitPrice) {
        result.data.pricingResult.NetUnitPrice.forEach(element => {
          netUnitPriceMap.set(element.dataPath.join('#'), element.value);
        });
      }

      if (result.data.pricingResult.PriceWaterFall) {
        result.data.pricingResult.PriceWaterFall.forEach(element => {
          waterfallMap.set(element.dataPath.join('#'), element.value);
        });
      }

      if (result.data.pricingResult.UnitPrice) {
        result.data.pricingResult.UnitPrice.forEach(element => {
          unitPriceMap.set(element.dataPath.join('#'), element.value);
        });
      }
    }
  }

  //create final cartData for UI
  productIndex = 0;
  const userCartId = userCartObject.id;
  products.forEach(product => {
    const total = netUnitPriceMap.get(userCartId + '#' + product.productId + parseInt(productIndex)) || 0;
    const unitPrice = unitPriceMap.get(userCartId + '#' + product.productId + parseInt(productIndex)) || 0;
    cartTotal += parseFloat(total);
    const formattedUnitPrice = currencyFormatter.format(unitPrice);
    const formattedTotal = currencyFormatter.format(total.toFixed(2));
    cartData.push({
      userCartId: product.id,
      displayUrl: product.displayUrl,
      unitPrice: formattedUnitPrice,
      waterfallInput: waterfallMap.size > 0 ? (waterfallMap.get(userCartId + '#' + product.productId + parseInt(productIndex)) ? getWaterfall(JSON.parse(waterfallMap.get(userCartId + '#' + product.productId + parseInt(productIndex)).replace(/&quot;/g,'"'))):null) : null,
      quantity: product.quantity,
      discountType: product.discountType,
      discountValue: product.discountValue,
      name: product.productName,
      productId: product.productId,
      productAttributes: attributeMap.get(product.productId + parseInt(productIndex)) ? attributeMap.get(product.productId + parseInt(productIndex)) : 'No Attributes',
      psm: psmMap.get(product.productId + parseInt(productIndex)) ? psmMap.get(product.productId + parseInt(productIndex)) : 'No PSM',
      total: formattedTotal
    });
    productIndex++;
  });

  cartTotal = currencyFormatter.format(cartTotal);

  let categoryObjects;
  try {
    categoryObjects = await axios.get(
      catalogEpcApi + process.env.DEFAULT_CATALOG_ID + "/categories",
      { headers });
  } catch (error) {
    res.handleFetchError(error);
  }

  const categories = categoryObjects?.data?.categories?.map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    numberOfProducts: category.numberOfProducts,
  }));

	res.render("cartDetails", {
    userId,
    cartTotal: cartTotal,
    cartData: cartData,
    categories: categories,
    totalItemsInCart: await getTotalItemsInCart(userId),
    errorMessage: errorMessage
  });
});

// Function to add an item to the cart
async function addProductToCart(userId, productId, name, displayUrl, numberOfProducts, attributeDefinitions, psmSelection, userCartObject) {
  let existingItemsByProductId = [];
  try {
    existingItemsByProductId = await userCartDao.findUserCartItemsByUserIdAndProductIdAndUserCartId(userId, productId, userCartObject.id);
  } catch(e) {
    console.log(`Error occurred while fetching cart from db: ${e}`);
  }

  const existingItem = isTheProductUnique(existingItemsByProductId, attributeDefinitions, psmSelection);

  if (existingItem) {
    const newQuantity = parseInt(numberOfProducts) + parseInt(existingItem.quantity);
    // Update the item by its ID
    await userCartDao.findByIdAndUpdateQuantity(existingItem.id, newQuantity);
  } else {
    const userCartDetails = {
      userId,
      productId,
      quantity: numberOfProducts,
      productName: name,
      displayUrl,
      UserCartItemAtrributes : attributeDefinitions ? attributeDefinitions.map(attributeDefinition => ({attributeName: attributeDefinition.name,
      attributeValue: attributeDefinition.value})) : [],
      UserCartItemPsms:  psmSelection ? psmSelection.map(psm => ({psmId: psm.name,
        psmName: psm.value})) : []
    }
    await userCartDao.saveUserCartItem(userCartDetails, userCartObject);
  }
}

// function to get waterfall
function getWaterfall(_waterfallData){

  SKIP_WATERFALL_LIST = ['PRORATION', 'FORMULAPRICING', 'AGGREGATEPRICE', 'SUBSCRIPTIONPRICING'];
  LIST_PRICE_ELEMENT = 'ListPrice';

    let i = 0;
    const indexToRemove = [];
    var isEmptyListPrice = false;
    // this._waterfallData = {...this.waterfallData};
    // this._waterfallData.waterfall = [...this._waterfallData.waterfall];
    // this._waterfallData.output = {...this._waterfallData.output};
    _waterfallData.output.units = _waterfallData.output.quantity > 1 ? 'units' : 'unit';
    _waterfallData.waterfall.forEach((waterfallItem, index, arr) => {
        if(waterfallItem.pricingElement.elementType === this.LIST_PRICE_ELEMENT){
            if(!(waterfallItem.outputParameters && Object.keys(waterfallItem.outputParameters).length > 0)){
              isEmptyListPrice=true;
            }
        }
        if (this.SKIP_WATERFALL_LIST.includes(waterfallItem.pricingElement.elementType)
            || Object.keys(waterfallItem.outputParameters).length === 0
            || (!isAdjustmentAvailable(waterfallItem.pricingElement.adjustments)
                && waterfallItem.pricingElement.elementType != this.LIST_PRICE_ELEMENT)) {
            indexToRemove.push(index);
            return;
        }
        _waterfallData.outputParameters = {...waterfallItem.outputParameters};
        if (Object.keys(_waterfallData.outputParameters).length === 0) {
            _waterfallData.waterfall.splice(i, 1);
        }
        _waterfallData.inputParameters = {...waterfallItem.inputParameters};
        _waterfallData.output.units = waterfallItem.inputParameters.Quantity > 1 ? 'units' : 'unit';
        _waterfallData.output.quantity = waterfallItem.inputParameters.Quantity;
        if (waterfallItem.pricingElement.adjustments
            && waterfallItem.pricingElement.adjustments.length > 0
            && waterfallItem.pricingElement.adjustments[0].AdjustmentType) {
            const updatedWaterfall = {...waterfallItem};
            if (waterfallItem.pricingElement.adjustments[0].AdjustmentType === 'AdjustmentPercentage'
                || waterfallItem.pricingElement.adjustments[0].AdjustmentType === 'Percentage') {
                updatedWaterfall.adjustmentDesc = ' - ' + waterfallItem.pricingElement.adjustments[0].AdjustmentValue + '%';
            } else if (waterfallItem.pricingElement.adjustments[0].AdjustmentType === 'AdjustmentAmount'
                || waterfallItem.pricingElement.adjustments[0].AdjustmentType === 'Amount') {
                updatedWaterfall.adjustmentDesc = ' - ' + currencyFormatter.format(waterfallItem.pricingElement.adjustments[0].AdjustmentValue);
            } else if (waterfallItem.pricingElement.adjustments[0].AdjustmentType === 'OverrideAmount'
                || waterfallItem.pricingElement.adjustments[0].AdjustmentType === 'Override') {
                updatedWaterfall.override = true;
                updatedWaterfall.adjustmentDesc = ' ' + currencyFormatter.format(waterfallItem.pricingElement.adjustments[0].AdjustmentValue);
            }
            arr[index] = updatedWaterfall;
        }
        if (waterfallItem.outputParameters.NetUnitPrice) {
          waterfallItem.outputParameters.NetUnitPrice = currencyFormatter.format(waterfallItem.outputParameters.NetUnitPrice);
        }
        if (waterfallItem.outputParameters.ListPrice) {
          waterfallItem.outputParameters.ListPrice = currencyFormatter.format(waterfallItem.outputParameters.ListPrice);
            _waterfallData.output.elementListPrice = waterfallItem.outputParameters.ListPrice;
        }
        i++;
    });
    if(isEmptyListPrice){
      __waterfallData = '';
      return;
    }
    if (indexToRemove.length > 0) {
        for (var j = indexToRemove.length -1; j >= 0; j--)
              _waterfallData.waterfall.splice(indexToRemove[j],1);
        }
    _waterfallData.output.totalListAmount = currencyFormatter.format(_waterfallData.output.Subtotal);
    _waterfallData.output.productName = _waterfallData.lineItemId;
    return _waterfallData;

}

function isAdjustmentAvailable(adjustments = []) {
  return (adjustments.length > 0 && adjustments[0].AdjustmentType && adjustments[0].AdjustmentValue);
}

module.exports = router;
