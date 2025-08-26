const { HttpClient } = require('../utils/httpClient');
const config = require('../config/midtrans');
const CryptoUtils = require('../utils/crypto');

/**
 * Invoice Service for Midtrans
 * Handles invoice creation and management
 */
class InvoiceService {
  constructor() {
    this.httpClient = new HttpClient();
    this.baseUrl = config.baseUrls.invoice;
  }

  /**
   * Create invoice
   * @param {Object} invoiceData - Invoice details
   * @returns {Promise<Object>} Invoice response
   */
  async createInvoice(invoiceData) {
    this.validateInvoiceData(invoiceData);
    const payload = this.prepareInvoicePayload(invoiceData);
    
    try {
      return await this.httpClient.post(
        this.baseUrl,
        '/v1/invoices',
        payload
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get invoice details
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice details
   */
  async getInvoice(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    try {
      return await this.httpClient.get(
        this.baseUrl,
        `/v1/invoices/${invoiceId}`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated invoice
   */
  async updateInvoice(invoiceId, updateData) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    try {
      return await this.httpClient.patch(
        this.baseUrl,
        `/v1/invoices/${invoiceId}`,
        updateData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelInvoice(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    try {
      return await this.httpClient.post(
        this.baseUrl,
        `/v1/invoices/${invoiceId}/cancel`,
        {}
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Expire invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Expiration result
   */
  async expireInvoice(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    try {
      return await this.httpClient.post(
        this.baseUrl,
        `/v1/invoices/${invoiceId}/expire`,
        {}
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all invoices with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} List of invoices
   */
  async getAllInvoices(filters = {}) {
    const params = {
      page: filters.page || 1,
      per_page: filters.per_page || 10,
      status: filters.status,
      created_at_start: filters.created_at_start,
      created_at_end: filters.created_at_end,
      external_id: filters.external_id
    };

    // Remove undefined values
    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    try {
      return await this.httpClient.get(
        this.baseUrl,
        '/v1/invoices',
        params
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send invoice via email
   * @param {string} invoiceId - Invoice ID
   * @param {Object} emailData - Email configuration
   * @returns {Promise<Object>} Email sending result
   */
  async sendInvoiceEmail(invoiceId, emailData) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!emailData.to || !emailData.subject) {
      throw new Error('Email recipient and subject are required');
    }

    const payload = {
      to: emailData.to,
      subject: emailData.subject,
      message: emailData.message || 'Please find your invoice attached.',
      sender_name: emailData.sender_name || 'Invoice System'
    };

    try {
      return await this.httpClient.post(
        this.baseUrl,
        `/v1/invoices/${invoiceId}/send-email`,
        payload
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get invoice PDF
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} PDF download information
   */
  async getInvoicePDF(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    try {
      return await this.httpClient.get(
        this.baseUrl,
        `/v1/invoices/${invoiceId}/pdf`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add payment to invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Payment addition result
   */
  async addPaymentToInvoice(invoiceId, paymentData) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    this.validatePaymentData(paymentData);

    try {
      return await this.httpClient.post(
        this.baseUrl,
        `/v1/invoices/${invoiceId}/payments`,
        paymentData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get invoice payments
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} List of payments
   */
  async getInvoicePayments(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    try {
      return await this.httpClient.get(
        this.baseUrl,
        `/v1/invoices/${invoiceId}/payments`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate invoice data
   * @param {Object} invoiceData - Invoice data to validate
   */
  validateInvoiceData(invoiceData) {
    const required = ['invoice_details', 'customer_details'];
    
    for (const field of required) {
      if (!invoiceData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate invoice details
    const { invoice_details } = invoiceData;
    if (!invoice_details.invoice_number || !invoice_details.due_date || !invoice_details.invoice_items) {
      throw new Error('invoice_number, due_date, and invoice_items are required in invoice_details');
    }

    // Validate invoice items
    if (!Array.isArray(invoice_details.invoice_items) || invoice_details.invoice_items.length === 0) {
      throw new Error('invoice_items must be a non-empty array');
    }

    // Validate each item
    invoice_details.invoice_items.forEach((item, index) => {
      if (!item.name || !item.quantity || !item.price) {
        throw new Error(`Invoice item at index ${index} is missing required fields (name, quantity, price)`);
      }
      
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Invoice item at index ${index} must have a positive quantity`);
      }
      
      if (typeof item.price !== 'number' || item.price <= 0) {
        throw new Error(`Invoice item at index ${index} must have a positive price`);
      }
    });

    // Validate customer details
    const { customer_details } = invoiceData;
    if (!customer_details.email && !customer_details.phone) {
      throw new Error('At least email or phone is required in customer_details');
    }
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   */
  validatePaymentData(paymentData) {
    const required = ['amount', 'payment_method'];
    
    for (const field of required) {
      if (!paymentData[field]) {
        throw new Error(`${field} is required for payment`);
      }
    }

    if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }
  }

  /**
   * Prepare invoice payload
   * @param {Object} invoiceData - Raw invoice data
   * @returns {Object} Prepared payload
   */
  prepareInvoicePayload(invoiceData) {
    const payload = { ...invoiceData };

    // Generate external ID if not provided
    if (!payload.external_id) {
      payload.external_id = CryptoUtils.generateOrderId('INV');
    }

    // Calculate total amount from items if not provided
    const { invoice_details } = payload;
    if (!invoice_details.total_amount) {
      let totalAmount = 0;
      
      invoice_details.invoice_items.forEach(item => {
        totalAmount += item.quantity * item.price;
      });
      
      // Apply tax if provided
      if (invoice_details.tax_amount) {
        totalAmount += invoice_details.tax_amount;
      }
      
      // Apply discount if provided
      if (invoice_details.discount_amount) {
        totalAmount -= invoice_details.discount_amount;
      }
      
      invoice_details.total_amount = totalAmount;
    }

    // Set default currency
    if (!invoice_details.currency) {
      invoice_details.currency = 'IDR';
    }

    // Set default invoice date to current date
    if (!invoice_details.invoice_date) {
      invoice_details.invoice_date = new Date().toISOString().split('T')[0];
    }

    // Set default payment methods
    if (!payload.enabled_payments) {
      payload.enabled_payments = [
        'credit_card', 'bank_transfer', 'echannel', 'gopay', 
        'ovo', 'dana', 'shopeepay', 'qris', 'cstore'
      ];
    }

    return payload;
  }

  /**
   * Create simple invoice
   * @param {string} invoiceNumber - Invoice number
   * @param {Object} customer - Customer details
   * @param {Array} items - Invoice items
   * @param {string} dueDate - Due date (YYYY-MM-DD)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Invoice response
   */
  async createSimpleInvoice(invoiceNumber, customer, items, dueDate, options = {}) {
    const invoiceData = {
      external_id: options.external_id || CryptoUtils.generateOrderId('INV'),
      invoice_details: {
        invoice_number: invoiceNumber,
        due_date: dueDate,
        invoice_items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          description: item.description || ''
        })),
        tax_amount: options.tax_amount || 0,
        discount_amount: options.discount_amount || 0,
        notes: options.notes || ''
      },
      customer_details: customer
    };

    return this.createInvoice(invoiceData);
  }

  /**
   * Create recurring invoice
   * @param {Object} invoiceData - Invoice data
   * @param {Object} recurringConfig - Recurring configuration
   * @returns {Promise<Object>} Recurring invoice response
   */
  async createRecurringInvoice(invoiceData, recurringConfig) {
    const payload = this.prepareInvoicePayload(invoiceData);
    
    payload.recurring = {
      frequency: recurringConfig.frequency || 'monthly',
      interval: recurringConfig.interval || 1,
      max_interval: recurringConfig.max_interval || 12,
      start_date: recurringConfig.start_date || new Date().toISOString().split('T')[0]
    };

    try {
      return await this.httpClient.post(
        this.baseUrl,
        '/v1/invoices',
        payload
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate invoice totals
   * @param {Array} items - Invoice items
   * @param {number} taxAmount - Tax amount (optional)
   * @param {number} discountAmount - Discount amount (optional)
   * @returns {Object} Calculated totals
   */
  calculateInvoiceTotals(items, taxAmount = 0, discountAmount = 0) {
    let subtotal = 0;
    
    items.forEach(item => {
      subtotal += item.quantity * item.price;
    });
    
    const total = subtotal + taxAmount - discountAmount;
    
    return {
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: total
    };
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount in IDR
   * @returns {string} Formatted amount
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get invoice status options
   * @returns {Array<string>} List of possible invoice statuses
   */
  getInvoiceStatuses() {
    return ['pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'expired'];
  }

  /**
   * Check if invoice is overdue
   * @param {string} dueDate - Due date (YYYY-MM-DD)
   * @param {string} status - Current invoice status
   * @returns {boolean} True if overdue
   */
  isInvoiceOverdue(dueDate, status) {
    if (status === 'paid' || status === 'cancelled' || status === 'expired') {
      return false;
    }
    
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day
    
    return due < now;
  }

  /**
   * Calculate days until due
   * @param {string} dueDate - Due date (YYYY-MM-DD)
   * @returns {number} Days until due (negative if overdue)
   */
  getDaysUntilDue(dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const timeDiff = due.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Generate invoice number
   * @param {string} prefix - Prefix for invoice number
   * @returns {string} Generated invoice number
   */
  generateInvoiceNumber(prefix = 'INV') {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = CryptoUtils.generateRandomString(4);
    
    return `${prefix}-${year}${month}${day}-${random}`;
  }
}

module.exports = InvoiceService;