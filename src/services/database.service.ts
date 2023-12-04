import { config } from 'dotenv'
import { MongoClient, ServerApiVersion, Db, Collection } from 'mongodb'
import { Bill } from '~/models/schemas/bills.schema'
import Conversation from '~/models/schemas/conversations.schema'
import { Customer } from '~/models/schemas/customers.schema'
import { Invoice } from '~/models/schemas/invoice.schema'
import { Order } from '~/models/schemas/orders.schema'
import { Product } from '~/models/schemas/products.schema'
import { RefreshToken } from '~/models/schemas/refresh_tokens.schema'
import { User } from '~/models/schemas/users.schema'
import { Voucher } from '~/models/schemas/vouchers.schema'

config()

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@nguyencluster.9jtxhap.mongodb.net/?retryWrites=true&w=majority`

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true
      }
    })
    this.db = this.client.db(process.env.DB_NAME) //create database instance to connect
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (err) {
      console.log('An error occurred', err)
      throw err
    }
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USER_COLLECTION as string)
  }

  get bills(): Collection<Bill> {
    return this.db.collection(process.env.DB_BILL_COLLECTION as string)
  }

  get customers(): Collection<Customer> {
    return this.db.collection(process.env.DB_CUSTOMER_COLLECTION as string)
  }

  get products(): Collection<Product> {
    return this.db.collection(process.env.DB_PRODUCT_COLLECTION as string)
  }

  get orders(): Collection<Order> {
    return this.db.collection(process.env.DB_ORDER_COLLECTION as string)
  }
  get conversations(): Collection<Conversation> {
    return this.db.collection(process.env.DB_CONVERSATION_COLLECTION as string)
  }

  get invoices(): Collection<Invoice> {
    return this.db.collection(process.env.DB_INVOICE_COLLECTION as string)
  }
  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKEN_COLLECTION as string)
  }

  get vouchers(): Collection<Voucher> {
    return this.db.collection(process.env.DB_VOUCHER_COLLECTION as string)
  }

  async indexUsers() {
    const exists = await this.users.indexExists(['email_1'])
    if (!exists) {
      console.log('indexing user collections ...')
      await this.users.createIndex({ email: 1 })
    }
  }

  async indexVouchers() {
    const exists = await this.vouchers.indexExists(['code_1'])
    if (!exists) {
      console.log('indexing voucher collections ...')
      await this.vouchers.createIndex({ code: 1 })
    }
  }

  async indexRefreshTokens() {
    const exists = await this.refreshTokens.indexExists(['token_1'])

    if (!exists) {
      console.log('indexing refresh tokens collections ...')
      await this.refreshTokens.createIndex(
        { token: 1 },
        {
          expireAfterSeconds: 0
        }
      )
    }
  }

  async indexCustomers() {
    const exists = await this.customers.indexExists(['full_name_text_phone_number_text'])
    if (!exists) {
      console.log('indexing customer collections ...')
      await this.customers.createIndex({ full_name: 'text', phone_number: 'text' }, { default_language: 'none' })
    }
  }

  async indexProduct() {
    const exists = await this.products.indexExists(['product_name_text_description_text_barcode_text'])
    if (!exists) {
      console.log('indexing product collections ...')
      this.products.createIndex({ product_name: 'text', description: 'text', barcode: 'text' })
    }
  }
}

const databaseService = new DatabaseService()
export default databaseService
