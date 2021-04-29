import { prop, getModelForClass } from '@typegoose/typegoose'

export class User {
  @prop({ required: true, index: true, unique: true })
  id: number

  @prop({ required: true, default: 'en' })
  language: string

  @prop({ default: -1 })
  start_msg: number
}

// Get User model
const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
})

// Get or create user
export async function findUser(id: number) {
  let user = await UserModel.findOne({ id })
  if (!user) {
    try {
      user = await new UserModel({ id }).save()
    } catch (err) {
      user = await UserModel.findOne({ id })
    }
  }
  return user
}

export async function setStart(id: number, start_id: number) {
  let user = await UserModel.findOne({ id })
  if (!user) {
    try {
      user = await new UserModel({ id }).save()
    } catch (err) {
      user = await UserModel.findOne({ id })
    }
  }
  user.start_msg = start_id
  await UserModel.updateOne({ id }, user)
}

export async function getStart(id: number) {
  let user = await UserModel.findOne({ id })
  if (!user) {
    return -1
  }
  return user.start_msg
}

export async function deleteInterval(id: number) {
  let user = await UserModel.findOne({ id })
  if (user) {
    user.start_msg = -1
    await UserModel.updateOne({ id }, user)
  }
}