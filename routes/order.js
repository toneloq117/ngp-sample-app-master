const express = require('express');
const router = express.Router();
const _ = require('lodash');
const { getTotalItemsInCart } = require('../utils/cartUtils');
const { getCategories } = require('../utils/categoryUtils');
const userCartDao = require("../dao/UserCartDao");


router.get('/:id', async (req, res) => {
	try {
		const userId = req.cookies.loggedInUserId || 'GUEST';
		const categories = await getCategories(req, res);
		if (_.isEmpty(categories)) {
			res.status(500).send('Internal error occurred while fetching the list of categories');
			return;
		}

		/* de-activate the cart at checkout */
		await userCartDao.inactivateUserCart(userId);

		res.render('orderDetails', {
			totalItemsInCart: await getTotalItemsInCart(userId),
			categories: categories, 
		});

	} catch(error) {
		res.handleFetchError(error);
	}
});

module.exports = router;