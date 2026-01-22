import path from 'node:path'

import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { AcceptLanguageResolver, I18nModule as NestI18nModule } from 'nestjs-i18n'

import { I18nConfig } from './i18n.config'

@Module({})
export class I18nModule {
  static register(): DynamicModule {
    return {
      module: I18nModule,
      imports: [
        NestI18nModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const { fallbackLng, localePath } = configService.get<I18nConfig>('i18n') as I18nConfig
            return {
              fallbackLanguage: fallbackLng,
              loaderOptions: {
                // 使用项目根目录作为基础路径，支持前后端共用翻译文件
                path: path.join(process.cwd(), localePath),
                watch: true
              },
              typesOutputPath: path.join(process.cwd(), 'libs/srv-shared/src/i18n/i18n.generated.ts')
            }
          },
          resolvers: [AcceptLanguageResolver]
        })
      ],
      exports: [NestI18nModule]
    }
  }
}
