const { DataTypes } = require("sequelize");

const userPreferenceModel = {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prefKey: {
    type: DataTypes.STRING
  },
  prefValue: {
    type: DataTypes.STRING
  }
};

const userPreferenceDetailModel = {
  prefDetailProperty: {
    type: DataTypes.STRING,
  },
  prefDetailValue: {
    type: DataTypes.STRING,
  },
};

// added first time/ marked inactive at checkout
const userCartModel = {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
};

const userCartItemModel = {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  productId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  discountType: {
    type: DataTypes.STRING
  },
  discountValue: {
    type: DataTypes.DECIMAL
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  displayUrl: {
    type: DataTypes.STRING
  }
};

const userCartItemPsmModel = {
  psmId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  psmName: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}

const userCartItemAtrributeModel = {
  attributeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  attributeValue: {
    type: DataTypes.STRING,
  }
};

module.exports = {userPreferenceModel, userPreferenceDetailModel, userCartModel, userCartItemModel, userCartItemAtrributeModel, userCartItemPsmModel};