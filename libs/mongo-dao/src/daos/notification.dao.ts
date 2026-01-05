import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'

import { Model } from 'mongoose'

import { NotificationDoc } from '../schemas/notification.schema'
import { AbstractDao } from './abstract.dao'

@Injectable()
export class NotificationDao extends AbstractDao<NotificationDoc> {
  protected readonly logger = new Logger(NotificationDao.name)

  // Page.name is internal attributes of the class, it will return 'page'
  constructor(@InjectModel(NotificationDoc.name) NotificationModel: Model<NotificationDoc>) {
    super(NotificationModel)
  }

  async findCurrent(userId: string): Promise<NotificationDoc | null> {
    return this.findOne({ userId })
  }

  async saveCurrent(userId: string, state: Buffer) {
    return this.findOneAndUpdate({ userId }, { state })
  }
}
