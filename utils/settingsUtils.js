const axios = require('axios');
const userSettingsDao = require('../dao/UserSettingsDao');

const getPrefDataFromDbAndStoreInCookie = async (req, res, userId) => {
	let prefData = null;

	try {
		const preferences = await userSettingsDao.findUserPreferencesByUserId(userId);

		console.log(`Preferences from DB for User ${userId}: ${preferences}`);

		if (preferences && preferences.length > 0) {
			prefData = {};
			preferences.map(pref => {
				if (pref.prefKey === 'DEFAULT_CONTEXT_DEFINITION') {
					const contextDefinitionName = pref.UserPreferenceDetail.prefDetailValue;
					const contextDefinitionId = pref.prefValue;
					prefData.contextDefinitionName = contextDefinitionName;
					prefData.contextDefinitionId = contextDefinitionId;
					res.cookie('contextDefinitionId', contextDefinitionId);
					res.cookie('contextDefinitionName', contextDefinitionName);

				} else if (pref.prefKey === 'DEFAULT_CONTEXT_MAPPING') {
					const contextMappingName = pref.UserPreferenceDetail.prefDetailValue;
					const contextMappingId = pref.prefValue;
					prefData.contextMappingName = contextMappingName;
					prefData.contextMappingId = contextMappingId;
					res.cookie('contextMappingId', contextMappingId);
					res.cookie('contextMappingName', contextMappingName);

				} else if (pref.prefKey === 'DEFAULT_PRICING_PROCEDURE') {
					const pricingProcedureName = pref.UserPreferenceDetail.prefDetailValue;
					const pricingProcedureId = pref.prefValue;
					prefData.pricingProcedureName = pricingProcedureName;
					prefData.pricingProcedureId = pricingProcedureId;
					res.cookie('pricingProcedureId', pricingProcedureId);
					res.cookie('pricingProcedureName', pricingProcedureName);

				} else if (pref.prefKey === 'DEFAULT_ACCOUNT') {
					const accountName = pref.UserPreferenceDetail.prefDetailValue;
					const accountId = pref.prefValue;
					prefData.accountName = accountName;
					prefData.accountId = accountId;
					res.cookie('accountId', accountId);
					res.cookie('accountName', accountName);

				} else if (pref.prefKey === 'DEFAULT_ACCOUNT_REGION') {
					prefData.accountRegion = pref.prefValue;
					res.cookie('accountRegion', pref.prefValue);

				} else if (pref.prefKey === 'DEFAULT_ACCOUNT_MEMBERSHIP_STATUS') {
					prefData.accountMembershipStatus = pref.prefValue;
					res.cookie('accountMembershipStatus', pref.prefValue);
				}
			})
		} 
	} catch (error) {
		console.log(`Error occurred while fetching preference from db: ${error}`);
	}

	return prefData;
};

const getContextDataFromOrg = async (req, res) => {
  const ACCESS_TOKEN = req.cookies.accessToken;
  const INSTANCE_URL = req.cookies.instanceUrl;
	const URI = INSTANCE_URL + '/services/data/v59.0/connect/context-definitions/' + process.env.CONTEXT_DEFINITION_ID;
	const headers = {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + ACCESS_TOKEN
	};

	const contextData = {
		contextDefinitionName: '',
		contextMappingName: ''
	};

	try {
		const response = await axios.get(URI, {headers});

		contextData.contextDefinitionName = response?.data?.developerName;
		const activeCDVs = response?.data?.contextDefinitionVersionList.filter(cdv => cdv.isActive === true);
		const contextMappings = activeCDVs.flatMap(cdv => cdv.contextMappings);
		const targetContextMapping = contextMappings.filter(cm => cm.contextMappingId === process.env.CONTEXT_MAPPING_ID);

		if (targetContextMapping && targetContextMapping.length > 0) {
			contextData.contextMappingName = targetContextMapping[0]?.name;
		}
	} catch (error) {
		console.log(`Error occurred while fetching context defintion detail: ${error}`);
		throw error;
	}

	return contextData;
};

const getPricingProceduresFromOrg = async (req, res) => {
  const ACCESS_TOKEN = req.cookies.accessToken;
  const INSTANCE_URL = req.cookies.instanceUrl;
  const URI = INSTANCE_URL + '/services/data/v60.0/graphql';
  const headers = {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + ACCESS_TOKEN
	};

	const pricingProcedures = [];

	try {
		//const response = await axios.get(URI, {headers});
		const response = await axios.post(
			URI,
			{
				query:"query ExpressionSetInfo{\n uiapi{\nquery{\nexpressionset(where: { UsageType: { eq: \"DefaultPricing\" }}, first:1000){\nedges{\nnode{\nName{\nvalue\ndisplayValue\n}\nExpressionSetDefinitionId{\nvalue\ndisplayValue\n}\n UsageType{\nvalue\ndisplayValue\n}\nLastModifiedDate{\nvalue\ndisplayValue\n}\n}\n}\n}\n}\n}\n}"
			},
			{ headers }
		  );
		response?.data?.data?.uiapi?.query?.expressionset?.edges?.map(record => {
			pricingProcedures.push({
				pricingProcedureId: record.node.ExpressionSetDefinitionId.value,
				pricingProcedureName: record.node.Name.value
			});
		});
	} catch (error) {
		console.log(`Error occurred while fetching context defintion detail: ${error}`);
		throw error;
	}
	
	// hit ES api and filter procedures based on the context def id

	return pricingProcedures;
};

const isPrefDataInCookie = (req, res) => {
	if (!req.cookies.contextDefinitionId
		|| !req.cookies.contextDefinitionName
		|| !req.cookies.contextMappingId
		|| !req.cookies.contextMappingName
		|| !req.cookies.pricingProcedureId
		|| !req.cookies.pricingProcedureName
		|| !req.cookies.accountId
		|| !req.cookies.accountName
		|| !req.cookies.accountRegion
		|| !req.cookies.accountMembershipStatus
		) {

		return false;
	}

	return true;
}

const getCustomAccounts = async (req, res) => {
	const ACCESS_TOKEN = req.cookies.accessToken;
	const INSTANCE_URL = req.cookies.instanceUrl;
	const ACCOUNTS_SOQL = INSTANCE_URL + '/services/data/v59.0/query';

	let accounts = [];

	try {
		const query = "SELECT Id, Name, Account__r.Id, Account__r.Name, MembershipStatus__c, Region__c  FROM CustomAccount__c limit 50";
		const currQueryUri = ACCOUNTS_SOQL + '?q=' + query;

		const headers = {
			'Authorization': 'Bearer ' + ACCESS_TOKEN,
			'Content-Type': 'application/json'
		};

		const result = await axios.get(currQueryUri, {headers});
		accounts = result.data.records;
	} catch (error) {
		console.log(`Error occurred while fetching accounts : ${error}`);
		res.handleFethErrorReturn(error);
	}
	
	return accounts;
}

module.exports = {getPrefDataFromDbAndStoreInCookie, getContextDataFromOrg, getPricingProceduresFromOrg, isPrefDataInCookie, getCustomAccounts};