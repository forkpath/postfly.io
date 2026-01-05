import { Prop, Schema } from '@nestjs/mongoose'

import { SchemaTypes } from 'mongoose'

@Schema({
  toJSON: {
    virtuals: true,
    versionKey: false
  },
  toObject: { virtuals: true }
})
export class AbstractDoc {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  _id?: string
}
