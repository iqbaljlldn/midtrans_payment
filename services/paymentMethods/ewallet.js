const { HttpClient } = require('../../utils/httpClient');
const config = require('../../config/midtrans');

class EWalletService {
    constructor() {
        this.httpClient = new HttpClient()
        this.baseUrl = config.baseUrls.api
    }

    async createGoPayPayment(paymentData) {
        const payload = this.prepareGoPayPayload(paymentData)

        try {
            const response = await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            )

            return {
                response,
                qr_string: response.actions?.find(action => action.name === 'generate-qr-code')?.url,
                deeplink: response.actions?.find(action => action.name === 'deeplink-redirect')?.url
            }
        } catch (error) {
            throw error
        }
    }

    async createOVOPayment(paymentData) {
        const payload = this.prepareOVOPayload(paymentData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async createDanaPayment(paymentData) {
        const payload = this.prepareDanaPayload(paymentData);

        try {
            const response = await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            );

            return {
                ...response,
                deeplink: response.actions?.find(action => action.name === 'deeplink-redirect')?.url
            };
        } catch (error) {
            throw error;
        }
    }

    async createShopeePayPayment(paymentData) {
        const payload = this.prepareShopeePayPayload(paymentData);

        try {
            const response = await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            );

            return {
                ...response,
                deeplink: response.actions?.find(action => action.name === 'deeplink-redirect')?.url
            };
        } catch (error) {
            throw error;
        }
    }

    async createLinkAjaPayment(paymentData) {
        const payload = this.prepareLinkAjaPayload(paymentData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getPaymentStatus(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v2/${orderId}/status`
            );
        } catch (error) {
            throw error;
        }
    }

    async cancelPayment(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v2/${orderId}/cancel`,
                {}
            );
        } catch (error) {
            throw error;
        }
    }

    prepareGoPayPayload(paymentData) {
        return {
            payment_type: 'gopay',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            gopay: {
                enable_callback: true,
                callback_url: paymentData.callback_url || process.env.MIDTRANS_CALLBACK_URL
            }
        };
    }

    prepareOVOPayload(paymentData) {
        if (!paymentData.customer_details?.phone) {
            throw new Error('Phone number is required for OVO payment');
        }

        return {
            payment_type: 'ovo',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            ovo: {
                phone_number: paymentData.customer_details.phone
            }
        };
    }

    prepareDanaPayload(paymentData) {
        return {
            payment_type: 'dana',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            dana: {
                enable_callback: true,
                callback_url: paymentData.callback_url || process.env.MIDTRANS_CALLBACK_URL
            }
        };
    }

    prepareShopeePayPayload(paymentData) {
        return {
            payment_type: 'shopeepay',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            shopeepay: {
                enable_callback: true,
                callback_url: paymentData.callback_url || process.env.MIDTRANS_CALLBACK_URL
            }
        };
    }

    prepareLinkAjaPayload(paymentData) {
        if (!paymentData.customer_details?.phone) {
            throw new Error('Phone number is required for LinkAja payment');
        }

        return {
            payment_type: 'telkomsel_cash',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            telkomsel_cash: {
                phone_number: paymentData.customer_details.phone
            }
        };
    }
    async createEWalletPayment(provider, paymentData) {
        switch (provider.toLowerCase()) {
            case 'gopay':
                return this.createGoPayPayment(paymentData);
            case 'ovo':
                return this.createOVOPayment(paymentData);
            case 'dana':
                return this.createDanaPayment(paymentData);
            case 'shopeepay':
                return this.createShopeePayPayment(paymentData);
            case 'linkaja':
                return this.createLinkAjaPayment(paymentData);
            default:
                throw new Error(`Unsupported e-wallet provider: ${provider}`);
        }
    }

    getAvailableProviders() {
        return ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];
    }

    isProviderSupported(provider) {
        return this.getAvailableProviders().includes(provider.toLowerCase());
    }
}

module.exports = EWalletService;