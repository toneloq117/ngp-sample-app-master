# Installation
- create a .env file and add following entries:
```
SF_LOGIN_URL='https://harmonize-cpq-e2e2.dbl36.my.stm.salesforce.com'
CLIENT_KEY='get it from Org'
CLIENT_SECRET='get it from Org'
OAUTH_CALLBACK_URI='https://localhost:3303/login/token'
DEFAULT_CATALOG_ID='0ZSDE000000004i4AA'
DEFAULT_PAGE_SIZE_PRODUCTS_LIST=2
CONTEXT_DEFINITION_ID='11ODE00000001Ij2AI'
CONTEXT_MAPPING_ID='11jDE00000002lDYAQ'
PRICE_BOOK_ID='01sDE0000000CtoYAE'
CURRENCY_ISO_CODE='USD'
NODE_ENV=development
EPC_BASE_API = "/services/data/v59.0/connect/pcm/"
```
- run `openssl req -nodes -new -x509 -keyout server.key -out server.cert`
- run `npm install`, followed by `npm run dev` 
- point your browser to https://localhost:3303

# References
- https://salesforce.quip.com/07C6AckS7FoI EPC API doc
- reference app: https://stormy-shelf-55130-f635c87b0b5b.herokuapp.com/
- [Spike] NGP 246: Next Generation Pricing (NGP) Headless API - Quip - https://salesforce.quip.com/0KbCADxDNWBq

# Todo
- Switch to XRD org - P0
- Make heroku app work - P0
- Show List Price on product detail page - P0
- Preferences - P0
  - Populate context def from procedure id
  - Add DD for context mapping and populate from context def
- Upon error, show error.ejs page - P0
- DB
  - Evaluate sqlite - P0
  - Restructure cart in DB so that we have one document per cart and include attributedefinitions in it - P1
- Product Detail
  - Breadcrumbs are not correct - P1
  - Error: Cannot read properties of undefined (reading 'length') at productDetails.ejs:150 for a certain product - P1
- Product List
  - Clicking on the image only takes to Product detail page. Clickin on the card should work - P1
- PWF
	- Attribute and Volume adjustment descriptions should be better - P1
------------------
- Profile
  - Key and Value should have separate formatting - P1
  - Status text font can be even smaller - P1

# Postgres setup
- Local development
  - Post creating heroku app and adding postgres add on, you will be able to find env variable DATABASE_URL in the UI
  - Run `export DATABASE_URL={DATABASE_URL from heroku}` locally then start the app to connect with remote postgres
  - If local postgres development is needed then run `export DATABASE_URL={DATABASE_URL from local postgres}`, eg: export `DATABASE_URL=postgres://postgres@localhost:5432/p.das`
  - Then comment out dialectOptions in models/index.js