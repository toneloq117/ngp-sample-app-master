const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const _ = require('lodash');
const { getTotalItemsInCart } = require('../utils/cartUtils.js');
const { getCategories } = require('../utils/categoryUtils.js');


router.get('/', async (req, res) => {
	let issuedAtReadable = '';

	if (req.cookies.issuedAt) {
		issuedAtReadable = moment(parseInt(req.cookies.issuedAt)).format('YYYY-MM-DD HH:mm:ss');
	}

	let status = '';
	let message = '';

	if (req.cookies.accessToken) {
		status = "SUCCESS";
		message = "Logged in";
	} else{
		res.render('login', { 
			status: status || req.query.status, 
			message: message || req.query.message, 
			instanceUrl: req.cookies.instanceUrl || process.env.SF_LOGIN_URL || '',
			issuedAt: issuedAtReadable,
			totalItemsInCart: 0,
			categories: [],
			isLoggedIn: false,
			exceptionMessage: ''
		});
		return;
	}

  const headers = {
    Authorization: "Bearer " + req.cookies.accessToken,
    "Content-Type": "application/json",
  };

  const profileData = {
		userId: 'GUEST',
		orgId: '',
		displayName: '',
		userName: '',
		email: ''
	};

  try{
		const result = await axios.get(req.cookies.id, { headers });

		if (result?.status === 200 && result?.data) {
			profileData.userId = result.data.user_id;
			profileData.orgId = result.data.organization_id;
			profileData.displayName = result.data.display_name;
			profileData.userName = result.data.username;
			profileData.email = result.data.email;
			res.cookie('loggedInUserId', result?.data?.user_id);
		}

    const categories = await getCategories(req, res);
    if (_.isEmpty(categories)) {
      res.status(500).send('Internal error occurred while fetching the list of categories');
      return;
    }

		res.render('login', { 
			status: status || req.query.status, 
			message: message || req.query.message, 
			instanceUrl: req.cookies.instanceUrl || process.env.SF_LOGIN_URL || '',
			issuedAt: issuedAtReadable,
			profileData: profileData,
			totalItemsInCart: await getTotalItemsInCart(profileData.userId),
			categories: categories,
			isLoggedIn: true,
			exceptionMessage: ''
		});

	} catch (error) {
		if (error.response && error.response.status === 401) {
			console.log('Session Expired. Trying to refresh token');
			res.cookie('accessToken', '');
			res.cookie('issuedAt', '');
			res.redirect('/login/refresh');
		} else {
			console.log(`Internal error occurred ${error}`);
			res.render('login', { 
				status: '', 
				message: '', 
				instanceUrl: process.env.SF_LOGIN_URL || '',
				issuedAt: '',
				totalItemsInCart: await getTotalItemsInCart(profileData.userId),
				profileData: profileData,
				categories: [],
				isLoggedIn: false,
				exceptionMessage: 'Cannot fetch user details'
			});
		};
	}
	
});

// direct flow without jsforce
router.get('/direct', (req, res) => {
	const url = process.env.SF_LOGIN_URL
		+ '/services/oauth2/authorize' 
		+ '?client_id=' + process.env.CLIENT_KEY 
		+ '&response_type=code'
		+ '&redirect_uri=' + process.env.OAUTH_CALLBACK_URI;
	console.log(url);
	res.redirect(url);
});

router.get('/token', async (req, res) => {
	const code = req.query.code;
	console.log(`code from sf: ${code}`);
	const body = {
		"client_id": process.env.CLIENT_KEY,
		"client_secret": process.env.CLIENT_SECRET,
		"code": code,
		"redirect_uri": process.env.OAUTH_CALLBACK_URI,
		"grant_type": "authorization_code"
	};

	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
	};

	let data = {};

	try {
		const response = await axios.post(process.env.SF_LOGIN_URL + '/services/oauth2/token', body, {headers});
		data = response.data;
		console.log('response data: ', data);
	} catch (error) {
		console.log(error.message);
		res.redirect(`/login?status=failure&message=${error.message}`);
		return;
	}

	if (data && data.access_token) {
		console.log('Access Token: ', data.access_token);
		console.log('Instance URL: ', data.instance_url);
		console.log('Refresh Token: ', data.refresh_token);
		console.log('Issued At: ', data.issued_at);

		data.instance_url && res.cookie('instanceUrl', data.instance_url);
		data.access_token && res.cookie('accessToken', data.access_token);
		data.refresh_token && res.cookie('refreshToken', data.refresh_token);
		data.issued_at && res.cookie('issuedAt', data.issued_at);
		data.id && res.cookie('id', data.id);

		const success = await populateUserIdInCookie(data.access_token, data.id, req, res);

		if (success) {
			res.redirect('/');
		} else {
			res.redirect('/login?status=failure&message=Internal+Error+Occurred');
		}
	} else {
		res.redirect('/login?status=failure&message=Internal+Error+Occurred');
	}
});

// TODO: refactor duplicate code
router.get('/refresh', async (req, res) => {
	if (!req.cookies.refreshToken) {
		res.redirect('/login');
		return;
	}

	const redirectUri = req.query.redirectUri || '/';
	console.log(`Will redirect to ${redirectUri} post login`);

	const body = {
		"client_id": process.env.CLIENT_KEY,
		"client_secret": process.env.CLIENT_SECRET,
		"redirect_uri": process.env.OAUTH_CALLBACK_URI,
		"refresh_token": req.cookies.refreshToken,
		"grant_type": "refresh_token"
	}

	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
	};

	let data = {};

	try {
		const response = await axios.post(process.env.SF_LOGIN_URL + '/services/oauth2/token', body, {headers});
		data = response.data;
		console.log('response data: ', data);
	} catch (error) {
		console.log(error.message);
		if (error.response && error.response.status === 400) {
      console.log('Expired Refresh Token. Login again.');
      res.cookie('refreshToken', '');
			res.redirect('/login');
			return;
    } else {
			res.redirect('/login?status=failure&message=Internal+Error+Occurred');
			return;
    }
	}

	if (data && data.access_token) {
		console.log('Access Token: ', data.access_token);
		console.log('Instance URL: ', data.instance_url);
		console.log('Issued At: ', data.issued_at);

		data.instance_url && res.cookie('instanceUrl', data.instance_url);
		data.access_token && res.cookie('accessToken', data.access_token);
		data.issued_at && res.cookie('issuedAt', data.issued_at);

		const success = await populateUserIdInCookie(data.access_token, data.id, req, res);

		if (success) {
			res.redirect(redirectUri);
		} else {
			res.redirect('/login?status=failure&message=Internal+Error+Occurred');
		}
	} else {
		res.redirect('/login?status=failure&message=Internal+Error+Occurred');
	}
});

const populateUserIdInCookie = async (accessToken, uri, req, res) => {
	let success = false;

	try {
		console.log('requesting userId');
		const headers = {
			Authorization: "Bearer " + accessToken,
			"Content-Type": "application/json",
		};

		const result = await axios.get(uri, { headers });
		if (result?.status === 200 && result?.data) {
			res.cookie('loggedInUserId', result?.data?.user_id);
			success = true;
		}
	} catch (error) {
		console.log(`Error occurred while fetching userId: ${error.message}`);
	}

	return success;
}


module.exports = router;