import { NextFunction, Request, Response } from 'express'
import { Action, Role, UserStatus } from '~/constants/enums'
import { SERVER_MESSAGES } from '~/constants/messages'
import { SERVER_STATUS_CODE } from '~/constants/statuses'
import { ErrorWithStatus } from '~/models/Errors'
import { ParamsDictionary } from 'express-serve-static-core'
import { TokenPayload } from '~/models/requests/users.requests'
import { User } from '~/models/schemas/users.schema'
import { fileService } from '~/services/files.service'
import { userService } from '~/services/users.service'
import { sendVerifyEmail } from '~/utils/aws-ses'
import { paymentService } from '~/services/payments.service'
import { generate_week } from '~/utils/generate_data'

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  const { _id, status, role, avatar_url } = req.user as User
  const tokens = await userService.login({ user_id: _id.toString(), status, role })
  const result = {
    message: SERVER_MESSAGES.LOGIN_SUCCESSFUL,
    tokens,
    avatar: avatar_url,
    role
  }
  return res.status(SERVER_STATUS_CODE.OK).json(result)
}

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  const { refresh_token } = req.body
  const auth_user_id = (req.decoded_authorization as TokenPayload).user_id
  const refresh_user_id = (req.decoded_refresh_token as TokenPayload).user_id
  if (auth_user_id !== refresh_user_id) {
    return res.status(SERVER_STATUS_CODE.FORBIDDEN).json(SERVER_MESSAGES.LOGOUT_FAILED)
  }
  const logout_result = await userService.logout(refresh_token)
  if (logout_result.deletedCount != 0) {
    const result = {
      message: SERVER_MESSAGES.LOGOUT_SUCCESSFUL,
      logout_result
    }
    return res.status(SERVER_STATUS_CODE.OK).json(result)
  }
  return res.status(SERVER_STATUS_CODE.FORBIDDEN).json(SERVER_MESSAGES.LOGOUT_FAILED)
}

export const createAccountController = async (req: Request, res: Response, next: NextFunction) => {
  const { email, full_name } = req.body
  const email_verify_token = await userService.createStaffAccount({ email, full_name })
  //send verification email
  await sendVerifyEmail(email, email_verify_token)
  const result = {
    message: SERVER_MESSAGES.CREATE_ACCOUNT_SUCCESSFUL,
    email_verify_token
  }
  res.status(SERVER_STATUS_CODE.CREATED).json(result)
}

export const verifyTokenController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id, status, role } = req.decoded_verify_token as TokenPayload
  const { access_token, refresh_token } = await userService.login({ user_id, status, role })
  const result = {
    message: SERVER_MESSAGES.VERIFY_TOKEN_SUCCESSFUL_YOU_LOGGED_IN,
    tokens: {
      access_token,
      refresh_token
    }
  }
  res.status(SERVER_STATUS_CODE.ACCEPTED).json(result)
}

export const resendEmailVerifyController = async (req: Request, res: Response, next: NextFunction) => {
  const { _id } = req.user as User
  const service_result = await userService.resendVerifyToken(_id.toString())
  const result = { message: SERVER_MESSAGES.RESEND_VERIFY_EMAIL_FAILED as string, verify_token: '' }
  if (service_result.updated_result.acknowledged === true && service_result.updated_result.modifiedCount === 1) {
    result.message = SERVER_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESSFUL as string
    result.verify_token = service_result.verify_token
    return res.status(SERVER_STATUS_CODE.OK).json(result)
  }
  return res.status(SERVER_STATUS_CODE.INTERNAL_SERVER_ERROR).send(result)
}

export const createPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { password } = req.body
  const { acknowledged, modifiedCount } = await userService.createPassword({ user_id, password })

  if (acknowledged === true && modifiedCount === 1) {
    const { access_token, refresh_token } = await userService.login({
      user_id,
      status: UserStatus.Verified,
      role: Role.Staff
    })

    return res.status(SERVER_STATUS_CODE.OK).json({
      message: SERVER_MESSAGES.CREATE_PASSWORD_SUCCESS_YOUR_ACCOUNT_VERIFIED,
      tokens: {
        access_token,
        refresh_token
      }
    })
  }
  return res.status(SERVER_STATUS_CODE.INTERNAL_SERVER_ERROR).json(SERVER_MESSAGES.CREATE_PASSWORD_FAILED)
}

export const getStaffListController = async (req: Request, res: Response, next: NextFunction) => {
  const staffList = await userService.getStaffList()
  res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.GET_STAFF_LIST_SUCCESS, staffList })
}

export const getStaffInfoController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params
  if (!staff_id) {
    return res.status(SERVER_STATUS_CODE.BAD_REQUEST).json({ message: 'Staff id is required' })
  }
  const [user, revenues, orders] = await Promise.all([
    userService.getStaffInfoById(staff_id),
    paymentService.getRevenue({ days: generate_week(true), user_id: staff_id }),
    paymentService.getOrderList({ days: generate_week(), user_id: staff_id })
  ])

  if (!user) {
    return res.status(SERVER_STATUS_CODE.NOT_FOUND).json({ message: SERVER_MESSAGES.STAFF_NOT_FOUND })
  }
  return res
    .status(SERVER_STATUS_CODE.OK)
    .json({ message: SERVER_MESSAGES.GET_STAFF_INFO_SUCCESS, user, chart_data: revenues, order_list: orders })
}

export const lockAccountController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.body
  if (!user_id) {
    throw new ErrorWithStatus({
      message: SERVER_MESSAGES.USER_ID_IS_REQUIRED,
      status_code: SERVER_STATUS_CODE.UNPROCESSABLE_ENTITY
    })
  }
  const updated_result = await userService.lockOrUnlock({ user_id, action: Action.Lock })
  if (updated_result.acknowledged === true && updated_result.modifiedCount === 1) {
    return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.LOCK_ACCOUNT_SUCCESS })
  }
  return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.LOCK_ACCOUNT_FAILED })
}

export const unlockAccountController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.body
  if (!user_id) {
    throw new ErrorWithStatus({
      message: SERVER_MESSAGES.USER_ID_IS_REQUIRED,
      status_code: SERVER_STATUS_CODE.UNPROCESSABLE_ENTITY
    })
  }
  const updated_result = await userService.lockOrUnlock({ user_id, action: Action.Unlock })
  if (updated_result.acknowledged === true && updated_result.modifiedCount === 1) {
    return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.UNLOCK_ACCOUNT_SUCCESS })
  }
  return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.UNLOCK_ACCOUNT_FAILED })
}

export const changePasswordController = async (req: Request, res: Response) => {
  const { password } = req.body
  const { user_id, role, status } = req.decoded_authorization as TokenPayload

  const { acknowledged, modifiedCount } = await userService.changePassword({ user_id, password })
  if (acknowledged == true && modifiedCount == 1) {
    const { access_token, refresh_token } = await userService.login({ user_id, role, status })
    return res
      .status(SERVER_STATUS_CODE.OK)
      .json({ message: SERVER_MESSAGES.CHANGE_PASSWORD_SUCCESSFULLY, tokens: { access_token, refresh_token } })
  }
  return res.status(SERVER_STATUS_CODE.INTERNAL_SERVER_ERROR).json({ message: SERVER_MESSAGES.CHANGE_PASSWORD_FAILURE })
}

export const getMyProfileController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await userService.getMyProfile(user_id)
  if (!user) {
    return res.status(SERVER_STATUS_CODE.NOT_FOUND).json(SERVER_MESSAGES.STAFF_NOT_FOUND)
  }
  return res.status(SERVER_STATUS_CODE.OK).json(user)
}

export const uploadAvatarController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const avtFile = await fileService.compressFile(req)
  const avatar_url = avtFile[0]
  const { acknowledged, modifiedCount } = await userService.uploadAvatar({ user_id, avatar_url })
  if (acknowledged === true && modifiedCount === 1) {
    return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.UPLOAD_AVATAR_SUCCESSFULLY, avatar_url })
  }
  return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.UPLOAD_AVATAR_FAILURE })
}

export const refreshTokenController = async (req: Request, res: Response) => {
  const user_id_by_access = (req.decoded_authorization as TokenPayload).user_id
  const user_id_by_refresh = (req.decoded_refresh_token as TokenPayload).user_id
  if (user_id_by_access !== user_id_by_refresh) {
    throw new ErrorWithStatus({ message: SERVER_MESSAGES.INVALID_REQUEST, status_code: SERVER_STATUS_CODE.CONFLICT })
  }
  const { refresh_token } = req.body
  const { status, role } = req.decoded_authorization as TokenPayload

  const tokens = await userService.refreshToken({ user_id: user_id_by_access, refresh_token, status, role })
  return res.status(SERVER_STATUS_CODE.OK).json({ message: SERVER_MESSAGES.REFRESH_TOKEN_SUCCESSFUL, tokens })
}

// export const createCartController = async (req: Request<ParamsDictionary, any, AddToCartReqBody>, res: Response) => {
//   const { user_id } = req.decoded_authorization as TokenPayload
//   const { customer_id, product_list, tax } = req.body
//   //customer_id => new Customer()

//   const customer = await customerService.getCustomerById(customer_id)
//   //product_list <=> list product_id => list Product => list CartProduct
//   const cartProductList = await Promise.all(
//     product_list.map(async (cartProductReq) => {
//       const product = await productService.getProductById(cartProductReq.product_id)
//       if (product) {
//         const newCartProduct = new CartProduct({
//           product_id: product?._id as ObjectId,
//           product_name: product?.product_name as string,
//           price: product.retail_price,
//           quantity: cartProductReq.quantity
//         })
//         return newCartProduct
//       }
//       return null
//     })
//   )
//   const myCart = new Cart({
//     customer_info: customer as Customer,
//     product_list: cartProductList as CartProduct[],
//     tax: tax
//   })

//   await databaseService.carts.insertOne(myCart)
//   res.json(myCart)
//   //tax?
// }

//draft
// export const getCartController = async (req: Request, res: Response) => {
//   const { cart_id } = req.body
//   const cart = await databaseService.carts.findOne({ _id: new ObjectId(cart_id) })
//   return res.json(cart)
// }

export const salesHistoryController = async (req: Request, res: Response) => {
  const { staff_id } = req.params

  if (!staff_id || staff_id.length != 24) {
    return res.json('Staff Id is Invalid')
  }
  const sales_history = await paymentService.getBills(staff_id)
  return res.json(sales_history)
}
