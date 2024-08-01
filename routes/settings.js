const express = require('express');
const router = express.Router();
const _ = require('lodash');
const { getTotalItemsInCart } = require('../utils/cartUtils');
const {getPrefDataFromDbAndStoreInCookie, getContextDataFromOrg, getPricingProceduresFromOrg, isPrefDataInCookie, getCustomAccounts} = require('../utils/settingsUtils');
const { getCategories } = require('../utils/categoryUtils');
const userSettingsDao = require("../dao/UserSettingsDao");

router.get('/', async (req, res) => {
	const mode = req.query.mode || 'view';
	const reload = req.query.reload;
	const saveResult = req.query.saveResult || 'NONE';
	const userId = req.cookies.loggedInUserId || 'GUEST';
	const prefData = {
		contextDefinitionId: process.env.CONTEXT_DEFINITION_ID, 
		contextDefinitionName: req.cookies.contextDefinitionName || '',
		contextMappingId: process.env.CONTEXT_MAPPING_ID, 
		contextMappingName: req.cookies.contextMappingName || '', 
		pricingProcedureId: req.cookies.pricingProcedureId || '',
		pricingProcedureName: req.cookies.pricingProcedureName || '',
		accountName: req.cookies.accountName || '',
		accountId: req.cookies.accountId || '',
		accountRegion: req.cookies.accountRegion || '',
		accountMembershipStatus: req.cookies.accountMembershipStatus || '',
	};

	let pricingProcedures = [];
	let accounts = [];

	try {
		if (mode === 'edit') {
			if (!prefData.contextDefinitionName || !prefData.contextMappingName) {
				const contextData = await getContextDataFromOrg(req, res);
				prefData.contextDefinitionName = contextData.contextDefinitionName;
				prefData.contextMappingName = contextData.contextMappingName;
			} 

			pricingProcedures = await getPricingProceduresFromOrg(req, res);
			accounts = await getCustomAccounts(req, res);
		} else {
			if (reload === 'true' || !isPrefDataInCookie(req, res)) {
				let prefDataFromDb = await getPrefDataFromDbAndStoreInCookie(req, res, userId);

				if (!prefDataFromDb) {
					res.redirect('/settings?mode=edit');
					return;
				} else {
					prefData.contextDefinitionId = prefDataFromDb.contextDefinitionId;
					prefData.contextDefinitionName = prefDataFromDb.contextDefinitionName;
					prefData.contextMappingId = prefDataFromDb.contextMappingId;
					prefData.contextMappingName = prefDataFromDb.contextMappingName;
					prefData.pricingProcedureId = prefDataFromDb.pricingProcedureId;
					prefData.pricingProcedureName = prefDataFromDb.pricingProcedureName;
					prefData.accountName = prefDataFromDb.accountName;
					prefData.accountId = prefDataFromDb.accountId;
					prefData.accountRegion = prefDataFromDb.accountRegion;
					prefData.accountMembershipStatus = prefDataFromDb.accountMembershipStatus;
				}
			}
		}

		const categories = await getCategories(req, res);
		if (_.isEmpty(categories)) {
			res.status(500).send('Internal error occurred while fetching the list of categories');
			return;
		}

		res.render('settings', {
			totalItemsInCart: await getTotalItemsInCart(userId),
			categories: categories, 
			mode,
			saveResult,
			prefData,
			pricingProcedures,
			accounts
		});
	} catch (error) {
		res.handleFetchError(error);
	}
});

router.post('/', async (req, res) => {
	try {
		console.log(`Save Preference request: ${JSON.stringify(req.body)}`);
		const userId = req.cookies.loggedInUserId || 'GUEST';
		const prefs = req.body;

		/* flushing and creating user preferences as support for upsert filtered by foreign keys is not stable in v6.0 of sequelize */
		await userSettingsDao.clearUserPreferences();

		await userSettingsDao.createUserPreference(prefs, userId);

		res.status(201).json({redirectUrl: '/settings?mode=view&reload=true&saveResult=SUCCESS&message=Preference saved successfully!'});
	} catch (error) {
		console.log(`Error saving user preference: ${error}`);
		res.status(500).json({message: 'Internal error occurred'});
	}
});

module.exports = router;