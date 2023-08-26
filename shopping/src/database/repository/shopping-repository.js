const { CustomerModel, CartModel, ProductModel, OrderModel } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { APIError, BadRequestError } = require('../../utils/app-errors')


//Dealing with data base operations
class ShoppingRepository {

    // payment

    async Orders(customerId) {
        try {
            const orders = await OrderModel.find({ customerId });
            return orders;
        } catch (err) {
            throw APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Find Orders')
        }
    }

    async Cart(customerId) {
        try {
            const cart = await this.CartModel.find({ customerId });

            if (cart) {
                return cart;
            }

            return {};

        } catch (error) {
            throw APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Find Cart Items')
        }
    }

    async AddCartItem(customerId, item, qty, isRemove) {
        try {
            const cart = await CartModel.findOne({ customerId });
            const { _id } = item;

            if (cart) {
                let isExist = false;
                let cartItems = cart.items;

                if (cartItems.length > 0) {

                    cartItems.map((item) => {
                        if (item.product._id.toString() === _id.toString()) {
                            if (isRemove) {
                                cartItems.splice(cartItems.indexOf(item), 1);
                            } else {
                                item.unit = qty;
                            }
                            isExist = true;
                        }
                    });
                }

                if (!isExist && !isRemove) {
                    cartItems.push({ product: {...item}, unit: qty });
                }

                cartItems.items = cartItems;
                return await cartItems.save();
            } else {
                return await CartModel.create({
                    customerId,
                    items: [{ product: {...item}, unit: qty }]
                });
            }

        } catch (err) {
            throw new APIError(
                "API Error",
                STATUS_CODES.INTERNAL_ERROR,
                "Unable to Add items to Cart"
            );
        }
    }


    async CreateNewOrder(customerId, txnId) {

        //check transaction for payment Status

        try {
            const cart = await CartModel.findOne({ customerId });

            if (cart) {

                let amount = 0;

                let cartItems = cart.items;

                if (cartItems.length > 0) {
                    //process Order
                    cartItems.map(item => {
                        amount += parseInt(item.product.price) * parseInt(item.unit);
                    });

                    const orderId = uuidv4();

                    const order = new OrderModel({
                        orderId,
                        customerId,
                        amount,
                        txnId,
                        status: 'received',
                        items: cartItems
                    })

                    cart.items = [];

                    const orderResult = await order.save();

                    await cart.save();

                    return orderResult;
                }
            }

            return {}

        } catch (err) {
            throw APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Find Category')
        }


    }
}

module.exports = ShoppingRepository;