const { HttpClient } = require('../../utils/httpClient');
const config = require('../../config/midtrans');

class RetailOutletService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.api;
    }

    async createAlfamartPayment(paymentData) {
        const payload = this.prepareAlfamartPayload(paymentData)

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            )
        } catch (error) {
            throw error
        }
    }

    async createIndomaretPayment(paymentData) {
        const payload = this.prepareIndomaretPayload(paymentData)

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            )
        } catch (error) {
            throw error
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

    prepareAlfamartPayload(paymentData) {
        return {
            payment_type: 'cstore',
            item_details: paymentData.item_details,
            transaction_details: paymentData.transaction_details,
            cstore: {
                store: 'alfamart',
                alfamart_free_text_1: paymentData.alfamart_free_text_1 || paymentData.customer_details.first_name || '',
                alfamart_free_text_2: paymentData.alfamart_free_text_2 || paymentData.transaction_details.order_id || '',
                alfamart_free_text_3: paymentData.alfamart_free_text_3 || 'Payment'
            },
            customer_details: paymentData.customer_details,
        }
    }

    prepareIndomaretPayload(paymentData) {
        return {
            payment_type: 'cstore',
            item_details: paymentData.item_details,
            transaction_details: paymentData.transaction_details,
            cstore: {
                store: 'indomaret',
                message: paymentData.message || 'Payment via Indomaret'
            },
            customer_details: paymentData.customer_details,
        }
    }

    async createRetailOutletPayment(store, paymentData) {
        switch (store.toLowerCase()) {
            case 'indomaret':
                return this.createIndomaretPayment(paymentData)
            case 'alfamart':
                return this.createAlfamartPayment(paymentData)
            default:
                throw new Error('Unsupported retail outlet')
        }
    }

    getAvailableRetailOutlets() {
        return ['indomaret', 'alfamart'];
    }

    isRetailOutletSupported(store) {
        return this.getAvailableRetailOutlets().includes(store.toLowerCase());
    }

    getPaymentInstructions(store) {
        const instructions = {
            indomaret: {
                steps: [
                    'Datang ke gerai Indomaret terdekat',
                    'Informasikan kepada kasir bahwa Anda ingin melakukan pembayaran Midtrans',
                    'Berikan payment code kepada kasir',
                    'Kasir akan memproses pembayaran Anda',
                    'Simpan struk pembayaran sebagai bukti'
                ],
                notes: [
                    'Payment code berlaku selama 24 jam',
                    'Minimum pembayaran Rp 10.000',
                    'Maximum pembayaran Rp 5.000.000'
                ]
            },
            alfamart: {
                steps: [
                    'Datang ke gerai Alfamart terdekat',
                    'Informasikan kepada kasir bahwa Anda ingin melakukan pembayaran Midtrans',
                    'Berikan payment code kepada kasir',
                    'Kasir akan memproses pembayaran Anda',
                    'Simpan struk pembayaran sebagai bukti'
                ],
                notes: [
                    'Payment code berlaku selama 24 jam',
                    'Minimum pembayaran Rp 10.000',
                    'Maximum pembayaran Rp 2.500.000'
                ]
            }
        };

        return instructions[store.toLowerCase()] || null;
    }

    validatePaymentAmount(store, amount) {
        const limits = {
            indomaret: { min: 10000, max: 5000000 },
            alfamart: { min: 10000, max: 2500000 }
        };

        const limit = limits[store.toLowerCase()];
        if (!limit) {
            return { valid: false, message: 'Unsupported retail outlet' };
        }

        if (amount < limit.min) {
            return {
                valid: false,
                message: `Minimum payment amount for ${store} is Rp ${limit.min.toLocaleString('id-ID')}`
            };
        }

        if (amount > limit.max) {
            return {
                valid: false,
                message: `Maximum payment amount for ${store} is Rp ${limit.max.toLocaleString('id-ID')}`
            };
        }

        return { valid: true, message: 'Payment amount is valid' };
    }
}

module.exports = RetailOutletService