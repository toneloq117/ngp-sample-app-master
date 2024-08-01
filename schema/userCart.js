const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const attributeDefinition = new Schema({
    name: String,
    value: String
  });

const AttributeDefinition = mongoose.model('AttributeDefinition', attributeDefinition);

const userCart = new Schema({
    userId: String,
    productId: String,
    quantity: Number,
    name: String,
    displayUrl: String,
    attributeDefinitions: [{ type: Schema.Types.ObjectId, ref: 'AttributeDefinition' }]
  });

const UserCart = mongoose.model('UserCart', userCart);

module.exports = {UserCart, AttributeDefinition};