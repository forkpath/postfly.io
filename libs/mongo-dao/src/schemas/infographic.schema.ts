import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

import { AbstractDoc } from './abstract.schema.js'

// Do not add __v filed to the schema
@Schema({
  collection: 'infographics'
})
export class InfographicDoc extends AbstractDoc {
  @Prop({ type: String, required: true })
  infographicId!: string

  @Prop({
    type: Buffer,
    required: true,
    get: (data: Buffer) => (data ? new Uint8Array(data) : null),
    set: (data: Uint8Array) => Buffer.from(data)
  })
  state!: Uint8Array
}

export const InfographicSchema = SchemaFactory.createForClass(InfographicDoc)

// Configure virtual attribute 'id', which returns the value of '_id'
InfographicSchema.virtual('id')
  .get(function () {
    return this._id
  })
  .set(function (id: string) {
    this._id = id
  })
InfographicSchema.set('toJSON', {
  virtuals: true
})
InfographicSchema.set('toObject', {
  virtuals: true
})
