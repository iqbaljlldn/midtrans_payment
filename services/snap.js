const { HttpClient } = require('../utils/httpClient')
const config = require('../config/midtrans')
const CryptoUtils = require('../utils/crypto')

class SnapService {
    constructor() {
        this.httpClient = new HttpClient()
        this.baseUrl = config.baseUrls.snap
    }

    async createTransaction(transactionData) {
        this.validateTransactionData(transactionData)

        const payload = this.prepareTransactionPayload(transactionData)

        try {
            const response = await this.httpClient.post(
                this.baseUrl,
                '/snap/v1/transactions',
                payload,
            )

            return {
                token: response.token,
                redirectUrl: response.redirect_url,
                response,
            }
        } catch (error) {
            throw error
        }
    }

    async getTransactionStatus(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.get(
                config.baseUrls.api,
                `/v2/${orderId}/status`
            );
        } catch (error) {
            throw error;
        }
    }

    async cancelTransaction(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.post(
                config.baseUrls.api,
                `/v2/${orderId}/cancel`,
                {}
            );
        } catch (error) {
            throw error;
        }
    }

    async approveTransaction(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.post(
                config.baseUrls.api,
                `/v2/${orderId}/approve`,
                {}
            );
        } catch (error) {
            throw error;
        }
    }

    async refundTransaction(orderId, refundData = {}) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        const payload = {
            refund_key: refundData.refundKey || CryptoUtils.generateRandomString(10),
            amount: refundData.amount,
            reason: refundData.reason || 'Refund requested'
        };

        try {
            return await this.httpClient.post(
                config.baseUrls.api,
                `/v2/${orderId}/refund`,
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async expireTransaction(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.post(
                config.baseUrls.api,
                `/v2/${orderId}/expire`,
                {}
            );
        } catch (error) {
            throw error;
        }
    }

    validateTransactionData(transactionData) {
        const required = ['transaction_details', 'customer_details'];

        for (const field of required) {
            if (!transactionData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Validate transaction details
        const { transaction_details } = transactionData;
        if (!transaction_details.order_id || !transaction_details.gross_amount) {
            throw new Error('order_id and gross_amount are required in transaction_details');
        }

        // Validate customer details
        const { customer_details } = transactionData;
        if (!customer_details.email && !customer_details.phone) {
            throw new Error('At least email or phone is required in customer_details');
        }
    }

    prepareTransactionPayload(transactionData) {
        const payload = { ...transactionData };

        // Generate order ID if not provided
        if (!payload.transaction_details.order_id) {
            payload.transaction_details.order_id = CryptoUtils.generateOrderId('SNAP');
        }

        // Add default credit card config if not provided
        if (!payload.credit_card) {
            payload.credit_card = {
                secure: true,
                save_card: false
            };
        }

        // Add default callbacks if not provided
        if (!payload.callbacks) {
            payload.callbacks = {
                finish: process.env.MIDTRANS_FINISH_URL || 'https://example.com/finish',
                error: process.env.MIDTRANS_ERROR_URL || 'https://example.com/error',
                pending: process.env.MIDTRANS_PENDING_URL || 'https://example.com/pending'
            };
        }

        return payload;
    }

    async createSimpleTransaction(orderId, amount, customer, items = null) {
        const transactionData = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount
            },
            customer_details: customer
        };

        if (items) {
            transactionData.item_details = Array.isArray(items) ? items : [items];
        }

        return this.createTransaction(transactionData);
    }

    getSnapRedirectUrl(snapToken) {
        const baseSnapUrl = config.isProduction()
            ? 'https://app.midtrans.com'
            : 'https://app.sandbox.midtrans.com';

        return `${baseSnapUrl}/snap/v2/vtweb/${snapToken}`;
    }
}

module.exports = SnapService