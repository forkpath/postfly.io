import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'

import { Model, Types } from 'mongoose'

import { InfographicDoc } from '../schemas/infographic.schema'
import { AbstractDao } from './abstract.dao'

@Injectable()
export class InfographicDao extends AbstractDao<InfographicDoc> {
  protected readonly logger = new Logger(InfographicDao.name)

  constructor(@InjectModel(InfographicDoc.name) InfographicModel: Model<InfographicDoc>) {
    super(InfographicModel)
  }

  async findInfographic(infographicId: string): Promise<InfographicDoc | null> {
    return await this.findOne({ infographicId })
  }

  async saveInfographic(infographicId: string, state: Buffer) {
    return this.findOneAndUpdate({ infographicId: infographicId }, { state })
  }

  async duplicateInfographic(srcId: string, targetId: string): Promise<string | undefined> {
    const infographic = await this.findOne({ infographicId: srcId })
    if (!infographic) {
      return undefined
    }

    try {
      const stateBuffer = Buffer.from(infographic.state)

      const cloneTarget = await this.create({
        _id: new Types.ObjectId().toString(),
        infographicId: targetId,
        state: stateBuffer
      })
      return cloneTarget._id
    } catch (error) {
      this.logger.error(`Duplicate infographic failed: ${error}`)
      throw error
    }
  }

  async deleteInfographics(infographicIds: string[]): Promise<number> {
    return this.deleteMany({ infographicId: { $in: infographicIds } })
  }

  async deleteInfographic(infographicId: string): Promise<boolean> {
    return this.deleteOne({ infographicId })
  }
}
