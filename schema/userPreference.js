const mongoose = require('mongoose');

const userPreference = new mongoose.Schema({
	userId: String,
	prefKey: String,
	prefVal: {
		prefValId: String,
		prefValName: String
	}
});

const UserPreference = mongoose.model('UserPreference', userPreference);

module.exports = {UserPreference};