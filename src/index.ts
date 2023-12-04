import { config } from 'dotenv'
config()
import express from 'express'
import databaseService from './services/database.service'
import staffRouters from './routers/staffs.routes'
import managerRouters from './routers/managers.routes'
import userRouters from './routers/users.routes'
import { defaultErrorHandler } from './middlewares/errors.middlewares'
import { initialUploads } from './utils/files_handle'
import staticRouters from './routers/static.routes'
import cors, { CorsOptions } from 'cors'
import { initialData } from './utils/generate_data'
import productRouters from './routers/products.routes'
import paymentRouters from './routers/payments.routes'
import customerRouters from './routers/customer.routes'
import searchRouters from './routers/search.routes'
import historyRouters from './routers/history.routes'
import revenueRouters from './routers/revenue.routes'
import { createServer } from 'http'

import chatRouters from './routers/conversation.routes'
import { initialSocket } from './utils/socket'
import Conversation from './models/schemas/conversations.schema'
import { ObjectId } from 'mongodb'
const app = express()
const httpServer = createServer(app)
const corsOptions: CorsOptions = {
  origin: '*'
}
app.use(cors(corsOptions))
databaseService.connect()

initialUploads()
initialData()
const port = 4000

httpServer.listen(port, async () => {
  console.log(`POPS is listening on http://localhost:${port}`)
})

app.use(express.json())
app.use('/users', userRouters)
app.use('/managers', managerRouters)
app.use('/staffs', staffRouters)
app.use('/products', productRouters)
app.use('/static', staticRouters)
app.use('/payments', paymentRouters)
app.use('/customers', customerRouters)
app.use('/search', searchRouters)
app.use('/history', historyRouters)
app.use('/revenue', revenueRouters)
app.use('/chat', chatRouters)
app.use(defaultErrorHandler)

initialSocket(httpServer)
