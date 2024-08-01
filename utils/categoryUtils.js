const axios = require('axios');

const getCategories = async (req, res) => {
  const accessToken = req.cookies.accessToken;
  const instanceUrl = req.cookies.instanceUrl;

  const catalogEpcApi = instanceUrl + process.env.EPC_BASE_API + "catalogs/";
  const headers = {
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  };

	let categories = {};

  try {
		console.log(`Fetching categories for catalog: ${process.env.DEFAULT_CATALOG_ID}`);
    const categoryObjects = await axios.get(
      catalogEpcApi + process.env.DEFAULT_CATALOG_ID + "/categories",
      { headers }
    );

    categories = categoryObjects?.data?.categories?.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      numberOfProducts: category.numberOfProducts,
    }));
	} catch (error) {
		console.log(`Error fetching categories: ${error}`);
    throw error;
	}

	return categories;
}

module.exports = {getCategories};