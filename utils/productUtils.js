const axios = require("axios");

const getPaginatedListOfProducts = async (req, res, currentCategoryId, categories, page) => {
  const accessToken = req.cookies.accessToken;
  const instanceUrl = req.cookies.instanceUrl;

  const productsEpcApi = instanceUrl + process.env.EPC_BASE_API + "products";
  const headers = {
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  };

  const pageSize = process.env.DEFAULT_PAGE_SIZE_PRODUCTS_LIST;
  const startIndex = (page - 1) * pageSize;
  let productsData = {};

  try {
    const productsByCatalogId = await axios.post(
      productsEpcApi,
      {
        catalogIds: [process.env.DEFAULT_CATALOG_ID],
        categoryIds: [currentCategoryId],
        pageSize: pageSize,
        offset: startIndex,
      },
      { headers }
    );

    productsData.products = productsByCatalogId?.data?.products;
		let totalItems = productsData.products?.length;

		if (currentCategoryId) {
			productsData.activeCategory = categories.filter((category) => category.categoryId === currentCategoryId)[0];
			totalItems = productsData.activeCategory?.numberOfProducts; 
		} else {
			totalItems = categories.reduce((total, category) => total + category.numberOfProducts, 0);
		}

    productsData.totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < productsData.totalPages;
    const hasPreviousPage = startIndex > 0;

		//TODO: categories shouldn't come to home page, should go to category router instead (TBC)
		const categoryQueryParam = currentCategoryId ? `categoryId=${currentCategoryId}&` : '';
    productsData.nextPage = hasNextPage ? `/?${categoryQueryParam}page=${page + 1}` : null;
    productsData.previousPage = hasPreviousPage ? `/?${categoryQueryParam}page=${page - 1}` : null;
  } catch (error) {
    console.log(`Error occurred while fetching products: ${error}`);
    throw error;
  }

  return productsData;
};

const getProduct = async (req, res) => {
  const accessToken = req.cookies.accessToken;
  const instanceUrl = req.cookies.instanceUrl;
  const productId = req.params.id;

  const productDetailsEpcQuery = instanceUrl + process.env.EPC_BASE_API + "products/" + productId;
  const headers = {
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  };

  let productData = [];

  try {
    const result = await axios.get(productDetailsEpcQuery, { headers });
    productData = result.data?.products[0];
  } catch (error) {
    console.log(`Error occurred while fetching product detail: ${error}`);
    throw error;
  }

  return productData;
}

module.exports = {getPaginatedListOfProducts, getProduct};
