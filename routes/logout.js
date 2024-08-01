const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {

	res.clearCookie('instanceUrl');
	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');
	res.clearCookie('issuedAt');
	res.clearCookie('id');
	res.clearCookie('loggedInUserId');

	res.clearCookie('contextDefinitionId');
	res.clearCookie('contextDefinitionName');
	res.clearCookie('contextMappingId');
	res.clearCookie('contextMappingName');
	res.clearCookie('pricingProcedureId');
	res.clearCookie('pricingProcedureName');
	res.clearCookie('accountId');
	res.clearCookie('accountName');
	res.clearCookie('accountRegion');
	res.clearCookie('accountMembershipStatus');

	res.render('login', { 
		status: 'Not logged in',
		message: 'Not logged in',
		instanceUrl: process.env.SF_LOGIN_URL || '',
		issuedAt: '',
		totalItemsInCart: 0,
		categories: [],
		isLoggedIn: false,
		exceptionMessage: ''
	});
});


module.exports = router;