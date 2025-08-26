const { HttpClient } = require('../utils/httpClient')
const config = require('../config/midtrans')
const CryptoUtils = require('../utils/crypto')

class PaymentLinkService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.paymentLink;
    }

    async createPaymentLink(linkData) {
        this.validatePaymentLinkData(linkData);
        const payload = this.preparePaymentLinkPayload(linkData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v1/payment-links',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getPaymentLink(linkId) {
        if (!linkId) {
            throw new Error('Payment link ID is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/payment-links/${linkId}`
            );
        } catch (error) {
            throw error;
        }
    }

    async updatePaymentLink(linkId, updateData) {
        if (!linkId) {
            throw new Error('Payment link ID is required');
        }

        try {
            return await this.httpClient.patch(
                this.baseUrl,
                `/v1/payment-links/${linkId}`,
                updateData
            );
        } catch (error) {
            throw error;
        }
    }

    async deletePaymentLink(linkId) {
        if (!linkId) {
            throw new Error('Payment link ID is required');
        }

        try {
            return await this.httpClient.delete(
                this.baseUrl,
                `/v1/payment-links/${linkId}`
            );
        } catch (error) {
            throw error;
        }
    }

    async getAllPaymentLinks(filters = {}) {
        const params = {
            page: filters.page || 1,
            per_page: filters.per_page || 10,
            status: filters.status,
            created_at_start: filters.created_at_start,
            created_at_end: filters.created_at_end
        };

        // Remove undefined values
        Object.keys(params).forEach(key =>
            params[key] === undefined && delete params[key]
        );

        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/v1/payment-links',
                params
            );
        } catch (error) {
            throw error;
        }
    }

    async getPaymentLinkTransactions(linkId, filters = {}) {
        if (!linkId) {
            throw new Error('Payment link ID is required');
        }

        const params = {
            page: filters.page || 1,
            per_page: filters.per_page || 10,
            status: filters.status
        };

        // Remove undefined values
        Object.keys(params).forEach(key =>
            params[key] === undefined && delete params[key]
        );

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/payment-links/${linkId}/transactions`,
                params
            );
        } catch (error) {
            throw error;
        }
    }

    validatePaymentLinkData(linkData) {
        const required = ['transaction_details'];

        for (const field of required) {
            if (!linkData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Validate transaction details
        const { transaction_details } = linkData;
        if (!transaction_details.gross_amount) {
            throw new Error('gross_amount is required in transaction_details');
        }

        if (typeof transaction_details.gross_amount !== 'number' || transaction_details.gross_amount <= 0) {
            throw new Error('gross_amount must be a positive number');
        }
    }

    preparePaymentLinkPayload(linkData) {
        const payload = { ...linkData };

        // Generate order ID if not provided
        if (!payload.transaction_details.order_id) {
            payload.transaction_details.order_id = CryptoUtils.generateOrderId('PLINK');
        }

        // Add default usage limit if not provided
        if (!payload.usage_limit) {
            payload.usage_limit = 1;
        }

        // Add default expiry if not provided (24 hours from now)
        if (!payload.expiry) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 1); // 24 hours
            payload.expiry = {
                start_time: new Date().toISOString(),
                duration: 24,
                unit: 'hours'
            };
        }

        // Add default enabled payments if not provided
        if (!payload.enabled_payments) {
            payload.enabled_payments = [
                'credit_card', 'bank_transfer', 'echannel', 'gopay',
                'ovo', 'dana', 'shopeepay', 'qris', 'cstore'
            ];
        }

        return payload;
    }

    async createSimplePaymentLink(orderId, amount, title, options = {}) {
        const linkData = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount
            },
            payment_link: {
                title: title,
                description: options.description || `Payment for order ${orderId}`
            },
            usage_limit: options.usage_limit || 1
        };

        // Add expiry if provided
        if (options.expiry_hours) {
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + options.expiry_hours);
            linkData.expiry = {
                start_time: new Date().toISOString(),
                duration: options.expiry_hours,
                unit: 'hours'
            };
        }

        // Add enabled payments if provided
        if (options.enabled_payments) {
            linkData.enabled_payments = options.enabled_payments;
        }

        // Add customer details if provided
        if (options.customer_details) {
            linkData.customer_details = options.customer_details;
        }

        return this.createPaymentLink(linkData);
    }

    async createRecurringPaymentLink(linkData, recurringConfig) {
        const payload = this.preparePaymentLinkPayload(linkData);

        payload.recurring = {
            frequency: recurringConfig.frequency || 'monthly',
            interval: recurringConfig.interval || 1,
            max_interval: recurringConfig.max_interval || 12,
            start_date: recurringConfig.start_date || new Date().toISOString().split('T')[0]
        };

        // Set usage limit to unlimited for recurring
        payload.usage_limit = null;

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v1/payment-links',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getPaymentLinkAnalytics(linkId) {
        if (!linkId) {
            throw new Error('Payment link ID is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/payment-links/${linkId}/analytics`
            );
        } catch (error) {
            throw error;
        }
    }

    async sendPaymentLinkEmail(linkId, emailData) {
        if (!linkId) {
            throw new Error('Payment link ID is required');
        }

        if (!emailData.to || !emailData.subject) {
            throw new Error('Email recipient and subject are required');
        }

        const payload = {
            to: emailData.to,
            subject: emailData.subject,
            message: emailData.message || 'Please complete your payment using the link below.',
            sender_name: emailData.sender_name || 'Payment System'
        };

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v1/payment-links/${linkId}/send-email`,
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    generateQRCode(paymentUrl) {
        if (!paymentUrl) return null;

        const encodedUrl = encodeURIComponent(paymentUrl);
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`;
    }

    getAvailablePaymentMethods() {
        return [
            'credit_card', 'bank_transfer', 'echannel', 'permata',
            'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
            'qris', 'cstore', 'bca_klikpay', 'cimb_clicks'
        ];
    }

    validateExpiry(expiry) {
        if (!expiry.duration || !expiry.unit) {
            return { valid: false, message: 'Duration and unit are required for expiry' };
        }

        const validUnits = ['minutes', 'hours', 'days'];
        if (!validUnits.includes(expiry.unit)) {
            return { valid: false, message: 'Unit must be one of: minutes, hours, days' };
        }

        if (expiry.duration <= 0) {
            return { valid: false, message: 'Duration must be a positive number' };
        }

        // Check maximum limits
        const maxLimits = { minutes: 43200, hours: 720, days: 30 };

        if (expiry.duration > maxLimits[expiry.unit]) {
            return {
                valid: false,
                message: `Maximum ${expiry.unit} allowed is ${maxLimits[expiry.unit]}`
            };
        }

        return { valid: true, message: 'Expiry configuration is valid' };
    }
}

module.exports = PaymentLinkService