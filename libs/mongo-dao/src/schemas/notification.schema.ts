import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

import { AbstractDoc } from './abstract.schema'

// Do not add __v filed to the schema
@Schema({
  collection: 'notifications'
})
export class NotificationDoc extends AbstractDoc {
  @Prop({ type: String, required: true })
  userId!: string

  @Prop({
    type: Buffer,
    required: true,
    get: (data: Buffer) => (data ? new Uint8Array(data) : null),
    set: (data: Uint8Array) => Buffer.from(data)
  })
  state!: Uint8Array
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationDoc)

// Configure virtual attribute 'id', which returns the value of '_id'
NotificationSchema.virtual('id')
  .get(function () {
    return this._id
  })
  .set(function (id: string) {
    this._id = id
  })
NotificationSchema.set('toJSON', {
  virtuals: true
})
NotificationSchema.set('toObject', {
  virtuals: true
})
