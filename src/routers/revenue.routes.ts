import { Router } from 'express'
import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.service'
import { paymentService } from '~/services/payments.service'
import { generate_week } from '~/utils/generate_data'

const revenueRouters = Router()

revenueRouters.get('/revenue', async (req, res, next) => {
  const days = generate_week(true)
  const revenues = await paymentService.getRevenue({ days })
  const revenue_list: number[] = []
  const total_order_list: number[] = []
  const product_quantity_list: number[] = []
  revenues.forEach((obj) => {
    revenue_list.push(obj.total_each_day)
    total_order_list.push(obj.total_order)
    product_quantity_list.push(obj.total_product)
  })
  return res.json({ days, revenue_list, total_order_list, product_quantity_list })
})

revenueRouters.get('/order-list', async (req, res, next) => {
  const week = generate_week()
  const orderList = await paymentService.getOrderList({ days: week })
  return res.json(orderList)
})

revenueRouters.get('/invoice/:id', async (req, res, next) => {
  const { id } = req.params
  if (!id) {
    return res.json('order_id is required')
  }
  const invoice = await databaseService.invoices.findOne({ _id: new ObjectId(id) })
  return res.json(invoice)
})
revenueRouters.get('/revenue-detail', async (req, res, next) => {})

export default revenueRouters
