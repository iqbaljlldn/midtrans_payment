require('dotenv').config()

class MidtransConfig {
    constructor() {
        this.serverKey = process.env.MIDTRANS_SERVER_KEY
        this.clientKey = process.env.MIDTRANS_CLIENT_KEY
        this.environment = process.env.MIDTRANS_ENVIRONMENT || 'sandbox'
        this.timeout = process.env.MIDTRANS_TIMEOUT

        if (!this.serverKey) {
            throw new Error('MIDTRANS_SERVER_KEY is required in environment variables');
        }

        if (!this.clientKey) {
            throw new Error('MIDTRANS_CLIENT_KEY is required in environment variables');
        }

        this.baseUrls = this.getBaseUrls();
    }

    getBaseUrls() {
        const isProduction = this.environment === 'production'

        return {
            // Core API
            api: isProduction
                ? 'https://api.midtrans.com'
                : 'https://api.sandbox.midtrans.com',

            // SNAP API
            snap: isProduction
                ? 'https://app.midtrans.com'
                : 'https://app.sandbox.midtrans.com',

            // Payment Link API
            paymentLink: isProduction
                ? 'https://api.midtrans.com'
                : 'https://api.sandbox.midtrans.com',

            // Disbursement API
            disbursement: isProduction
                ? 'https://api.midtrans.com'
                : 'https://api.sandbox.midtrans.com',

            // Payout API (Iris)
            payout: isProduction
                ? 'https://app.midtrans.com'
                : 'https://app.sandbox.midtrans.com',

            // Invoice API
            invoice: isProduction
                ? 'https://api.midtrans.com'
                : 'https://api.sandbox.midtrans.com'
        };

    }

    getServerAuthHeader() {
        return Buffer.from(this.serverKey + ':').toString('base64')
    }

    getClientAuthHeader() {
        return Buffer.from(this.clientKey + ":").toString('base64')
    }

    isProduction() {
        return this.environment === 'production'
    }

    getEnvironmetInfo() {
        return {
            environment: this.environment,
            isProduction: this.isProduction(),
            timeout: this.timeout,
            baseUrls: this.baseUrls
        }
    }
}

module.exports = new MidtransConfig()
