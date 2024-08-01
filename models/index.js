const dbConfig = require("../postgres-config/local-db.config.js");
const {
  userPreferenceModel,
  userPreferenceDetailModel,
  userCartItemModel,
  userCartModel,
  userCartItemAtrributeModel,
  userCartItemPsmModel
} = require("./sampleApp.model.js");
const Sequelize = require("sequelize");

if (!process.env.DATABASE_URL) {
  console.error(
    "Cannot start app: Missing DB connection string. Run `export DATABASE_URL={connection_string}`"
  );
  process.exit(-1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: dbConfig.dialect,
  /* comment this section in order to be able to run with local postgres */
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  /* till here */
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

const UserPreference = sequelize.define("UserPreference", userPreferenceModel);
const UserPreferenceDetail = sequelize.define("UserPreferenceDetail", userPreferenceDetailModel);
const UserCart = sequelize.define("UserCart", userCartModel);
const UserCartItem = sequelize.define("UserCartItem", userCartItemModel);
const UserCartItemAtrribute = sequelize.define("UserCartItemAtrribute", userCartItemAtrributeModel);
const UserCartItemPsm = sequelize.define("UserCartItemPsm", userCartItemPsmModel);

/* define associations */

/* 1:1 */
UserPreference.hasOne(UserPreferenceDetail);
UserPreferenceDetail.belongsTo(UserPreference);
/* 1:N */
UserCart.hasMany(UserCartItem);
UserCartItem.belongsTo(UserCart);

/* 1:N */
UserCartItem.hasMany(UserCartItemAtrribute, {onDelete: 'CASCADE'});
UserCartItemAtrribute.belongsTo(UserCartItem);

/* 1:N */
UserCartItem.hasMany(UserCartItemPsm, {onDelete: 'CASCADE'});
UserCartItemPsm.belongsTo(UserCartItem);

/* exports */
db.userPreference = UserPreference;
db.userPreferenceDetail = UserPreferenceDetail;

db.userCart = UserCart;
db.userCartItem = UserCartItem;
db.userCartItemAtrribute = UserCartItemAtrribute;
db.userCartItemPsm = UserCartItemPsm;

module.exports = db;
