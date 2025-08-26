const crypto = require('crypto')
const config = require('../config/midtrans')

class CryptoUtils {
    static createSignature(orderId, statusCode, grossAmount, serverKey = null) {
        const key = serverKey || config.serverKey
        const signatureString = `${orderId}${statusCode}${grossAmount}${key}`

        return crypto
            .createHash('sha512')
            .update(signatureString)
            .digest('hex')
    }

    static validateNotificationSignature(notification) {
        const {
            order_id,
            status_code,
            gross_amount,
            signature_key
        } = notification

        if (!order_id || !status_code || !gross_amount || !signature_key) {
            console.error('❌ Missing required fields for signature validation');
            return false;
        }

        const expectedSignature = this.createSignature(
            order_id,
            status_code,
            gross_amount
        );

        const isValid = expectedSignature === signature_key;

        if (!config.isProduction()) {
            console.log('🔐 Signature validation:', {
                orderId: order_id,
                statusCode: status_code,
                grossAmount: gross_amount,
                receivedSignature: signature_key,
                expectedSignature,
                isValid
            });
        }

        return isValid
    }

    static generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        return result
    }

    static generateOrderId(prefix = 'ORDER') {
        const timestamp = Date.now()
        const random = this.generateRandomString(6)
        return `${prefix}-${timestamp}-${random}`
    }

    static createHmacSignature(data, secret, algorithm = 'sha256') {
        return crypto
            .createHmac(algorithm, secret)
            .update(data)
            .digest('hex')
    }

    static validateTimestamp(timestamp, maxAge = 300) {
        const now = Math.floor(Date.now() / 1000)
        const requestTime = Math.floor(timestamp / 1000)
        const age = now - requestTime

        return age >= 0 && age <= maxAge
    }

    static base64UrlEncode(data) {
        return Buffer.from(data)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    static base64UrlDecode(data) {
        const padding = 4 - (data.length % 4);
        if (padding !== 4) {
            data += '='.repeat(padding);
        }

        return Buffer.from(
            data.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        ).toString();
    }
}

module.exports = CryptoUtils