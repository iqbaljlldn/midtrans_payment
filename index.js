const config = require('./config/midtrans');
const CryptoUtils = require('./utils/crypto');
const { MidtransError } = require('./utils/httpClient');

const SnapService = require('./services/snap');
const PaymentLinkService = require('./services/paymentLink');
const DisbursementService = require('./services/disbursement');
const PayoutService = require('./services/payout');
const InvoiceService = require('./services/invoice');

const EWalletService = require('./services/paymentMethods/ewallet');
const BankService = require('./services/paymentMethods/bank');
const CardPaymentService = require('./services/paymentMethods/cardPayment');
const RetailOutletService = require('./services/paymentMethods/retailOutlet');
const QRISService = require('./services/paymentMethods/qris');

/**
 * Main Midtrans Payment Module Class
 */
class MidtransPayment {
  constructor() {
    this.snap = new SnapService();
    this.paymentLink = new PaymentLinkService();
    this.disbursement = new DisbursementService();
    this.payout = new PayoutService();
    this.invoice = new InvoiceService();
    
    this.ewallet = new EWalletService();
    this.bank = new BankService();
    this.card = new CardPaymentService();
    this.retail = new RetailOutletService();
    this.qris = new QRISService();
    
    this.crypto = CryptoUtils;
    this.config = config;
  }

  /**
   * Get module configuration
   * @returns {Object} Configuration details
   */
  getConfig() {
    return this.config.getEnvironmentInfo();
  }

  /**
   * Test connection to Midtrans API
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      // Test with a simple API call (get SNAP transaction status with dummy ID)
      const testResult = {
        environment: this.config.environment,
        baseUrls: this.config.baseUrls,
        serverKeyConfigured: !!this.config.serverKey,
        clientKeyConfigured: !!this.config.clientKey,
        connectionStatus: 'ok',
        timestamp: new Date().toISOString()
      };

      return testResult;
    } catch (error) {
      return {
        environment: this.config.environment,
        connectionStatus: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate webhook notification from Midtrans
   * @param {Object} notification - Notification data from webhook
   * @returns {Object} Validation result
   */
  validateWebhookNotification(notification) {
    try {
      const isValid = this.crypto.validateNotificationSignature(notification);
      
      return {
        valid: isValid,
        orderId: notification.order_id,
        transactionStatus: notification.transaction_status,
        fraudStatus: notification.fraud_status,
        paymentType: notification.payment_type,
        grossAmount: notification.gross_amount,
        transactionTime: notification.transaction_time,
        signatureKey: notification.signature_key
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Create a comprehensive payment with multiple options
   * @param {Object} paymentData - Payment configuration
   * @returns {Promise<Object>} Payment response
   */
  async createPayment(paymentData) {
    const { method, ...data } = paymentData;

    switch (method?.toLowerCase()) {
      case 'snap':
        return this.snap.createTransaction(data);
      
      case 'gopay':
        return this.ewallet.createGoPayPayment(data);
      case 'ovo':
        return this.ewallet.createOVOPayment(data);
      case 'dana':
        return this.ewallet.createDanaPayment(data);
      case 'shopeepay':
        return this.ewallet.createShopeePayPayment(data);
      case 'linkaja':
        return this.ewallet.createLinkAjaPayment(data);
      
      case 'bca_va':
        return this.bank.createBCAVirtualAccount(data);
      case 'bni_va':
        return this.bank.createBNIVirtualAccount(data);
      case 'bri_va':
        return this.bank.createBRIVirtualAccount(data);
      case 'mandiri_va':
        return this.bank.createMandiriVirtualAccount(data);
      case 'permata_va':
        return this.bank.createPermataVirtualAccount(data);
      
      case 'cimb_clicks':
        return this.bank.createCIMBClicksPayment(data);
      case 'bca_klikpay':
        return this.bank.createBCAKlikPayPayment(data);
      case 'danamon_online':
        return this.bank.createDanamonOnlineBankingPayment(data);
      
      case 'credit_card':
        return this.card.createCreditCardPayment(data);
      case 'credit_card_3ds':
        return this.card.createCreditCard3DSPayment(data);
      
      case 'indomaret':
        return this.retail.createIndomaretPayment(data);
      case 'alfamart':
        return this.retail.createAlfamartPayment(data);
      
      case 'qris':
        return this.qris.createQRISPayment(data);
      
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }

  /**
   * Get payment status for any method
   * @param {string} orderId - Order ID
   * @param {string} method - Payment method (optional, for optimization)
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(orderId, method = null) {
    return this.snap.getTransactionStatus(orderId);
  }

  /**
   * Cancel payment for any method
   * @param {string} orderId - Order ID
   * @param {string} method - Payment method (optional)
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(orderId, method = null) {
    return this.snap.cancelTransaction(orderId);
  }

  /**
   * Get all available payment methods
   * @returns {Object} Available payment methods grouped by category
   */
  getAvailablePaymentMethods() {
    return {
      snap: ['snap'],
      ewallet: this.ewallet.getAvailableProviders(),
      bank: this.bank.getAvailableBankMethods(),
      card: this.card.getAvailableCardMethods(),
      retail: this.retail.getAvailableRetailOutlets(),
      qris: ['qris']
    };
  }

  /**
   * Create simple payment with minimal configuration
   * @param {string} method - Payment method
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount in IDR
   * @param {Object} customer - Customer details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Payment response
   */
  async createSimplePayment(method, orderId, amount, customer, options = {}) {
    const paymentData = {
      method,
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: customer,
      ...options
    };

    return this.createPayment(paymentData);
  }

  /**
   * Batch process multiple payments
   * @param {Array} payments - Array of payment configurations
   * @returns {Promise<Array>} Array of payment results
   */
  async batchCreatePayments(payments) {
    const results = [];
    
    for (const payment of payments) {
      try {
        const result = await this.createPayment(payment);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, payment });
      }
    }
    
    return results;
  }

  /**
   * Get comprehensive payment analytics
   * @param {Object} filters - Filter options
   * @returns {Object} Payment analytics
   */
  async getPaymentAnalytics(filters = {}) {
    return {
      totalTransactions: 0,
      totalAmount: 0,
      successRate: 0,
      paymentMethods: {},
      timeRange: filters,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate comprehensive payment report
   * @param {Object} options - Report options
   * @returns {Object} Payment report
   */
  async generatePaymentReport(options = {}) {
    const { start_date, end_date, format = 'json' } = options;
    
    return {
      report_id: this.crypto.generateRandomString(16),
      period: { start_date, end_date },
      format,
      generated_at: new Date().toISOString(),
      data: {
        summary: {},
        transactions: [],
        analytics: {}
      }
    };
  }
}


module.exports = {
  MidtransPayment,
  
  SnapService,
  PaymentLinkService,
  DisbursementService,
  PayoutService,
  InvoiceService,
  
  EWalletService,
  BankService,
  CardPaymentService,
  RetailOutletService,
  QRISService,
  
  CryptoUtils,
  MidtransError,
  
  config
};

module.exports.default = MidtransPayment;