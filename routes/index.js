const express = require("express");
const router = express.Router();
const _ = require('lodash');
const { getTotalItemsInCart } = require('../utils/cartUtils');
const { getCategories } = require('../utils/categoryUtils');
const { getPaginatedListOfProducts } = require('../utils/productUtils');

router.get("/", async (req, res) => {
  const userId = req.cookies.loggedInUserId || 'GUEST';
  const categoryId = req.query.categoryId || ''; // TODO: ideally this shouldn't come to home page. should go to category router (TBC)
  const page = parseInt(req.query.page) || 1;

  try {
    const categories = await getCategories(req, res);
    if (_.isEmpty(categories)) {
      res.status(500).send('Internal error occurred while fetching the list of categories');
      return;
    }

    const productsData = await getPaginatedListOfProducts(req, res, categoryId, categories, page);
    if (_.isEmpty(productsData)) {
      res.status(500).send('Internal error occurred while fetching the list of products');
      return;
    }

    // TODO: rename index to home
    res.render("index", {
      products: productsData.products,
      categories: categories,
      activeCategory: productsData.activeCategory,
      currentPage: page,
      totalPages: productsData.totalPages,
      nextPage: productsData.nextPage,
      previousPage: productsData.previousPage,
      totalItemsInCart: await getTotalItemsInCart(userId) 
    });
  } catch(error) {
    res.handleFetchError(error);
  }
});

module.exports = router;
