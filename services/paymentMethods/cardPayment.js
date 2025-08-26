const { HttpClient } = require('../../utils/httpClient');
const config = require('../../config/midtrans');

class CardPaymentService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.api;
    }

    async createCreditCardPayment(paymentData) {
        const payload = this.prepareCreditCardPayload(paymentData);

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

    async createCreditCard3DSPayment(paymentData) {
        const payload = this.prepareCreditCard3DSPayload(paymentData);

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

    async createInstallmentPayment(paymentData, installmentData) {
        const payload = this.prepareInstallmentPayload(paymentData, installmentData);

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

    async createRecurringPayment(paymentData, recurringData) {
        const payload = this.prepareRecurringPayload(paymentData, recurringData);

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

    async getSavedCards(customerId) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/card/list/${customerId}`
            );
        } catch (error) {
            throw error;
        }
    }

    async deleteSavedCard(savedTokenId) {
        if (!savedTokenId) {
            throw new Error('Saved token ID is required');
        }

        try {
            return await this.httpClient.delete(
                this.baseUrl,
                `/v1/card/${savedTokenId}`
            );
        } catch (error) {
            throw error;
        }
    }

    async getInstallmentInfo(binNumber) {
        if (!binNumber || binNumber.length !== 6) {
            throw new Error('Valid 6-digit BIN number is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/bins/${binNumber}`
            );
        } catch (error) {
            throw error;
        }
    }

    async getCardToken(cardData) {
        const payload = {
            card_number: cardData.card_number,
            card_exp_month: cardData.card_exp_month,
            card_exp_year: cardData.card_exp_year,
            card_cvv: cardData.card_cvv,
            client_key: config.clientKey
        };

        try {
            return await this.httpClient.post(
                config.baseUrls.api,
                '/v1/tokens',
                payload,
                'client'
            );
        } catch (error) {
            throw error;
        }
    }

    prepareCreditCardPayload(paymentData) {
        if (!paymentData.card_token && !paymentData.saved_token_id) {
            throw new Error('Either card_token or saved_token_id is required');
        }

        const payload = {
            payment_type: 'credit_card',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            credit_card: {
                token_id: paymentData.card_token || paymentData.saved_token_id,
                authentication: paymentData.authentication || false,
                save_token_id: paymentData.save_card || false
            }
        };

        // Add bank for direct debit
        if (paymentData.bank) {
            payload.credit_card.bank = paymentData.bank;
        }

        return payload;
    }

    prepareCreditCard3DSPayload(paymentData) {
        const payload = this.prepareCreditCardPayload(paymentData);
        payload.credit_card.authentication = true;

        return payload;
    }

    prepareInstallmentPayload(paymentData, installmentData) {
        const payload = this.prepareCreditCardPayload(paymentData);

        payload.credit_card.installment = {
            required: true,
            terms: installmentData.terms || {}
        };

        // Add specific bank installment terms
        if (installmentData.bank_terms) {
            Object.assign(payload.credit_card.installment.terms, installmentData.bank_terms);
        }

        return payload;
    }

    prepareRecurringPayload(paymentData, recurringData) {
        const payload = this.prepareCreditCardPayload(paymentData);

        payload.credit_card.recurring = {
            frequency: recurringData.frequency || 'monthly',
            interval: recurringData.interval || 1,
            max_interval: recurringData.max_interval || 12
        };

        return payload;
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

    async capturePayment(orderId, amount = null) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        const payload = amount ? { transaction_details: { gross_amount: amount } } : {};

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v2/capture`,
                {
                    transaction_id: orderId,
                    ...payload
                }
            );
        } catch (error) {
            throw error;
        }
    }

    async cancelPreAuth(orderId) {
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

    async refundPayment(orderId, refundData = {}) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        const payload = {
            refund_key: refundData.refund_key || `refund_${Date.now()}`,
            amount: refundData.amount,
            reason: refundData.reason || 'Customer refund request'
        };

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v2/${orderId}/refund`,
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    getAvailableCardMethods() {
        return ['credit_card', '3ds', 'installment', 'recurring'];
    }

    validateCardNumber(cardNumber) {
        const num = cardNumber.replace(/\D/g, '');
        let sum = 0;
        let isEven = false;

        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num[i]);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    getCardType(cardNumber) {
        const num = cardNumber.replace(/\D/g, '');

        if (/^4/.test(num)) return 'visa';
        if (/^5[1-5]/.test(num)) return 'mastercard';
        if (/^3[47]/.test(num)) return 'amex';
        if (/^6(?:011|5)/.test(num)) return 'discover';

        return 'unknown';
    }
}

module.exports = CardPaymentService;