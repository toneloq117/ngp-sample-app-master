const express = require("express");
const router = express.Router();
const _ = require('lodash');
const { getTotalItemsInCart } = require('../utils/cartUtils.js');
const { getCategories } = require("../utils/categoryUtils.js");
const { getProduct } = require("../utils/productUtils.js");

router.get("/:id", async (req, res) => {
  const userId = req.cookies.loggedInUserId || 'GUEST';

  try {
    const categories = await getCategories(req, res);
    if (_.isEmpty(categories)) {
      res.status(500).send('Internal error occurred while fetching categories');
      return;
    }

    const productData = await getProduct(req, res);
    if (_.isEmpty(productData)) {
      res.status(500).send('Internal error occurred while fetching product detail');
      return;
    }

    res.render('productDetails', {
      product: productData, 
      totalItemsInCart: await getTotalItemsInCart(userId), 
      categories: categories
    });
  } catch (error) {
    res.handleFetchError(error);
  }
});

module.exports = router;
