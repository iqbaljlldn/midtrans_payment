const { MidtransPayment } = require('./index')

const midtrans = new MidtransPayment()

const test = midtrans.testConnection()
console.log(test)