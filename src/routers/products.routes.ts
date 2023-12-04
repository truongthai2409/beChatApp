import { Router } from 'express'
import {
  addProductController,
  getProductDetailController,
  getProductsController,
  uploadProductImageController
} from '~/controllers/products.controllers'
import { productValidator } from '~/middlewares/products.middlewares'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapSync } from '~/utils/wrapAsync'

const productRouters = Router()
productRouters.get('/product-list', accessTokenValidator, wrapSync(getProductsController))
productRouters.get('/product-detail/:product_id', accessTokenValidator, wrapSync(getProductDetailController))
productRouters.post('/upload-product-image', wrapSync(uploadProductImageController))
productRouters.post('/add-product', productValidator, wrapSync(addProductController))
export default productRouters
