import { ObjectId } from 'mongodb'

export type CustomerType = {
  full_name: string
  phone_number: string
  address: string
}

export class Customer {
  full_name: string
  phone_number: string
  address: string
  constructor(cus: CustomerType) {
    this.full_name = cus.full_name
    this.phone_number = cus.phone_number
    this.address = cus.address
  }
}
