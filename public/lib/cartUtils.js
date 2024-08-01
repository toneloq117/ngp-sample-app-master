async function addToCart(productId, productName, productDisplayUrl, productCount, attributeDefinitions, psmSelection) {

	const url = '/cart';
	const data = {
		productId,
		productName,
		productDisplayUrl,
		productCount: productCount,
		attributeDefinitions,
		psmSelection
	}

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			throw new Error('Internal error occurred');
		}

		const responseData = await response.json();
		return responseData.totalItemsInCart;
	} catch (error) {
		console.log(error.message);
		return 0;
	}
};

async function updateToCart(data) {
	const url = '/cart';
	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify([...data])
		});

		return response;
	} catch (error) {
		console.log(error.message);
		return 0;
	}
};

async function removeFromCart(userCartId) {

	const url = '/cart/' + userCartId;
	try {
		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'content-type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error('Internal error occurred');
		}

		const responseData = await response.json();
		return responseData.totalItemsInCart;
	} catch (error) {
		console.log(error.message);
		return 0;
	}
};

async function clearUserCart() {
	const url = '/cart';
	try {
		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'content-type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error('Internal error occurred');
		}
		const responseData = await response.json();
	} catch (error) {
		console.log(error.message);
	}
}

function showToastMessage(message, type) {
	const typeCls = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-primary';
	const toast = document.querySelector('#toast');
	toast.querySelector('.toast-body').innerText = message;
	toast.classList.add(typeCls);
	toast.classList.add('show');
	setTimeout(() => {
		toast.classList.remove('show');
		toast.classList.remove(typeCls);
		toast.querySelector('.toast-body').innerText = "";
	}, 3000);
}