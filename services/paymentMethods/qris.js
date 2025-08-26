const { HttpClient } = require('../../utils/httpClient');
const config = require('../../config/midtrans');

class QRISService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.api;
    }

    async createQRISPayment(paymentData) {
        const payload = this.prepareQRISPayload(paymentData);

        try {
            const response = await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            );

            return {
                ...response,
                qr_string: response.qr_string,
                qr_image_url: this.generateQRImageUrl(response.qr_string)
            };
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

    async expirePayment(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v2/${orderId}/expire`,
                {}
            );
        } catch (error) {
            throw error;
        }
    }

    prepareQRISPayload(paymentData) {
        return {
            payment_type: 'qris',
            transaction_details: paymentData.transaction_details,
            customer_details: paymentData.customer_details,
            item_details: paymentData.item_details,
            qris: {
                acquirer: paymentData.acquirer || 'gopay'
            }
        };
    }

    generateQRImageUrl(qrString) {
        if (!qrString) return null;

        // Using a QR code generator service (you can replace with your preferred service)
        const encodedQRString = encodeURIComponent(qrString);
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedQRString}`;
    }

    getPaymentInstructions() {
        return {
            steps: [
                'Buka aplikasi mobile banking, e-wallet, atau aplikasi pembayaran yang mendukung QRIS',
                'Pilih fitur "Scan QR" atau "Bayar dengan QRIS"',
                'Arahkan kamera ke QR Code yang ditampilkan',
                'Masukkan PIN atau verifikasi biometrik sesuai aplikasi yang digunakan',
                'Konfirmasi pembayaran',
                'Pembayaran berhasil diproses'
            ],
            supportedApps: [
                'GoPay', 'OVO', 'Dana', 'ShopeePay', 'LinkAja',
                'Bank BCA', 'Bank BNI', 'Bank BRI', 'Bank Mandiri',
                'Bank CIMB Niaga', 'Bank Permata', 'Bank Danamon'
            ],
            notes: [
                'QR Code berlaku selama 15 menit',
                'Pastikan aplikasi pembayaran Anda mendukung QRIS',
                'Pastikan saldo mencukupi untuk melakukan pembayaran',
                'Simpan bukti transaksi untuk referensi'
            ]
        };
    }

    isQRISExpired(transactionTime, expiryMinutes = 15) {
        const transactionDate = new Date(transactionTime);
        const currentDate = new Date();
        const diffMinutes = (currentDate - transactionDate) / (1000 * 60);

        return diffMinutes > expiryMinutes;
    }

    getQRISExpiryTime(transactionTime, expiryMinutes = 15) {
        const transactionDate = new Date(transactionTime);
        return new Date(transactionDate.getTime() + (expiryMinutes * 60 * 1000));
    }

    async createQRISWithCustomExpiry(paymentData, expiryMinutes = 15) {
        const payload = this.prepareQRISPayload(paymentData);

        // Add custom expiry time
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);

        payload.custom_expiry = {
            expiry_duration: expiryMinutes,
            unit: 'minute'
        };

        try {
            const response = await this.httpClient.post(
                this.baseUrl,
                '/v2/charge',
                payload
            );

            return {
                ...response,
                qr_string: response.qr_string,
                qr_image_url: this.generateQRImageUrl(response.qr_string),
                expiry_time: expiryTime.toISOString(),
                expiry_duration_minutes: expiryMinutes
            };
        } catch (error) {
            throw error;
        }
    }

    validatePaymentAmount(amount) {
        const minAmount = 1;
        const maxAmount = 10000000; // 10 million IDR

        if (amount < minAmount) {
            return {
                valid: false,
                message: `Minimum payment amount for QRIS is Rp ${minAmount.toLocaleString('id-ID')}`
            };
        }

        if (amount > maxAmount) {
            return {
                valid: false,
                message: `Maximum payment amount for QRIS is Rp ${maxAmount.toLocaleString('id-ID')}`
            };
        }

        return {
            valid: true,
            message: 'Payment amount is valid'
        };
    }

    getSupportedAcquirers() {
        return ['gopay', 'shopeepay'];
    }

    isAcquirerSupported(acquirer) {
        return this.getSupportedAcquirers().includes(acquirer.toLowerCase());
    }

    async createSimpleQRISPayment(orderId, amount, customer, acquirer = 'gopay') {
        const paymentData = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount
            },
            customer_details: customer,
            acquirer: acquirer
        };

        return this.createQRISPayment(paymentData);
    }
}

module.exports = QRISService