const db = require("../models");
const UserPreference = db.userPreference;
const UserPreferenceDetail = db.userPreferenceDetail;

/* find user preference and details by userId */
exports.findUserPreferencesByUserId = async (userId) => {
  return await UserPreference.findAll({
    where: { userId: userId },
    include: [UserPreferenceDetail],
  });
};

/* Save a new User Preference */
exports.createUserPreference = async (userDetails, userId) => {
  const insertPromises = [];
  userDetails.forEach((userDetail) => {
    userDetail.userId = userId;
    insertPromises.push(UserPreference.create(
      userDetail,
      {
        include: {
          model: UserPreferenceDetail,
          as: 'UserPreferenceDetail'
        },
      }))
  });
  await Promise.all(insertPromises);
};

/* Save a new User Preference detail */
exports.createUserPreferenceDetail = async (req) => {
  return await UserPreferenceDetail.create(req);
};

/* Clear user preferences */
exports.clearUserPreferences = async () => {
  await UserPreference.destroy({ truncate: { cascade: true } });
  return await UserPreferenceDetail.destroy({ truncate: { cascade: true } });
};
