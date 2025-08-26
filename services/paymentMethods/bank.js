const { HttpClient } = require('../../utils/httpClient');
const config = require('../../config/midtrans');

class BankService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.api;
    }

    async createBCAVirtualAccount(paymentData) {
        const payload = this.prepareBCAVAPayload(paymentData);

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

    async createBNIVirtualAccount(paymentData) {
        const payload = this.prepareBNIVAPayload(paymentData);

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

    async createBRIVirtualAccount(paymentData) {
        const payload = this.prepareBRIVAPayload(paymentData);

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

    async createMandiriVirtualAccount(paymentData) {
        const payload = this.prepareMandiriVAPayload(paymentData);

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

    async createPermataVirtualAccount(paymentData) {
        const payload = this.preparePermataVAPayload(paymentData);

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

    async createCIMBClicksPayment(paymentData) {
        const payload = this.prepareCIMBClicksPayload(paymentData);

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

    async createBCAKlikPayPayment(paymentData) {
        const payload = this.prepareBCAKlikPayPayload(paymentData);

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

    async createDanamonOnlineBankingPayment(paymentData) {
        const payload = this.prepareDanamonOnlineBankingPayload(paymentData);

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

    prepareBCAVAPayload(paymentData) {
        const payload = {
            payment_type: 'bank_transfer',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            bank_transfer: {
                bank: 'bca'
            }
        };

        if (paymentData.custom_va_number) {
            payload.bank_transfer.va_number = paymentData.custom_va_number;
        }

        return payload;
    }

    prepareBNIVAPayload(paymentData) {
        const payload = {
            payment_type: 'bank_transfer',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            bank_transfer: {
                bank: 'bni'
            }
        };

        if (paymentData.custom_va_number) {
            payload.bank_transfer.va_number = paymentData.custom_va_number;
        }

        return payload;
    }

    prepareBRIVAPayload(paymentData) {
        const payload = {
            payment_type: 'bank_transfer',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            bank_transfer: {
                bank: 'bri'
            }
        };

        if (paymentData.custom_va_number) {
            payload.bank_transfer.va_number = paymentData.custom_va_number;
        }

        return payload;
    }

    prepareMandiriVAPayload(paymentData) {
        return {
            payment_type: 'echannel',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            echannel: {
                bill_info1: paymentData.bill_info1 || 'Payment for Order',
                bill_info2: paymentData.bill_info2 || paymentData.transaction_details.order_id
            }
        };
    }

    preparePermataVAPayload(paymentData) {
        const payload = {
            payment_type: 'permata',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details
        };

        if (paymentData.custom_va_number) {
            payload.permata = {
                recipient_name: paymentData.recipient_name || paymentData.customer_details.first_name
            };
        }

        return payload;
    }

    prepareCIMBClicksPayload(paymentData) {
        return {
            payment_type: 'cimb_clicks',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            cimb_clicks: {
                description: paymentData.description || 'Payment via CIMB Clicks'
            }
        };
    }
    prepareBCAKlikPayPayload(paymentData) {
        return {
            payment_type: 'bca_klikpay',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            bca_klikpay: {
                description: paymentData.description || 'Payment via BCA KlikPay'
            }
        };
    }

    prepareDanamonOnlineBankingPayload(paymentData) {
        return {
            payment_type: 'danamon_online',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            danamon_online: {
                description: paymentData.description || 'Payment via Danamon Online Banking'
            }
        };
    }

    async createBankPayment(bank, paymentData) {
        switch (bank.toLowerCase()) {
            case 'bca_va':
                return this.createBCAVirtualAccount(paymentData);
            case 'bni_va':
                return this.createBNIVirtualAccount(paymentData);
            case 'bri_va':
                return this.createBRIVirtualAccount(paymentData);
            case 'mandiri_va':
                return this.createMandiriVirtualAccount(paymentData);
            case 'permata_va':
                return this.createPermataVirtualAccount(paymentData);
            case 'cimb_clicks':
                return this.createCIMBClicksPayment(paymentData);
            case 'bca_klikpay':
                return this.createBCAKlikPayPayment(paymentData);
            case 'danamon_online':
                return this.createDanamonOnlineBankingPayment(paymentData);
            default:
                throw new Error(`Unsupported bank payment method: ${bank}`);
        }
    }

    getAvailableBankMethods() {
        return [
            'bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'permata_va',
            'cimb_clicks', 'bca_klikpay', 'danamon_online'
        ];
    }

    isBankMethodSupported(bank) {
        return this.getAvailableBankMethods().includes(bank.toLowerCase());
    }
}

module.exports = BankService;