import { FileSize, Interval } from 'rotating-file-stream'

import { MongoConfig } from '@libs/mongo-dao'
import { PgConfig } from '@libs/pg-dao'
import {
  CacheConfig,
  ElasticsearchConfig,
  EmailConfig,
  I18nConfig,
  LoggerConfig,
  LogLevel,
  RabbitmqConfig,
  RedisConfig,
  SmsConfig,
  StorageConfig,
  ThrottlerConfig
} from '@libs/srv-shared'

export interface ServerConfig {
  portalPort: number
  corsOrigins: string // 如果有多个，请使用逗号分隔
}

export interface SecurityConfig {
  bcryptSaltOrRound: number
  accessTokenSecret: string
  accessTokenExpiredIn: string
  refreshTokenExpiredIn: string
}

interface Config {
  server: ServerConfig
  security: SecurityConfig
  // 数据库
  pg: PgConfig
  redis: RedisConfig
  mongo: MongoConfig
  // 中间件
  cache: CacheConfig
  logger: LoggerConfig
  i18n: I18nConfig
  throttler: ThrottlerConfig
  // 第三方服务
  email: EmailConfig
  storage: StorageConfig
  sms: SmsConfig
  // 其他
  rabbitmq: RabbitmqConfig
  elasticsearch: ElasticsearchConfig
}

const config: Config = {
  server: {
    portalPort: parseInt(process.env['PORTAL_PORT'] as string, 10) || 6006,
    corsOrigins: process.env['CORS_ORIGINS'] || '*'
  },
  security: {
    bcryptSaltOrRound: parseInt(process.env['SECURITY_SALT_ROUND'] as string, 10) || 10,
    accessTokenSecret: process.env['SECURITY_ACCESS_TOKEN_SECRET'] || 'access_secret',
    accessTokenExpiredIn: process.env['SECURITY_ACCESS_TOKEN_EXPIRED'] || '5m',
    refreshTokenExpiredIn: process.env['SECURITY_REFRESH_TOKEN_EXPIRED'] || '7d'
  },
  pg: {
    databaseUrl: process.env['DATABASE_URL'] || ''
  },
  redis: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] as string, 10) || 6379,
    password: process.env['REDIS_PASSWORD'] || ''
  },
  mongo: {
    host: process.env['MONGO_HOST'] || 'localhost',
    port: parseInt(process.env['MONGO_PORT'] as string, 10) || 27017,
    username: process.env['MONGO_INITDB_ROOT_USERNAME'] || 'mongo_user',
    password: process.env['MONGO_INITDB_ROOT_PASSWORD'] || 'mongo_password',
    database: process.env['MONGO_INITDB_DATABASE'] || 'mongo_db'
  },
  cache: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] as string, 10) || 6379,
    password: process.env['REDIS_PASSWORD'] || '',
    ttl: parseInt(process.env['CACHE_TTL'] as string, 10) || 1000 * 60 * 60 * 2, // 2 hours
    db: parseInt(process.env['CACHE_DB_INDEX'] as string, 10) || 0
  },
  logger: {
    level: (process.env['LOGGER_LEVEL'] as LogLevel) || 'info',
    scope: process.env['LOGGER_SCOPE'] || 'neo',
    fileEnabled: (process.env['LOGGER_FILE_ENABLED'] as string).toLowerCase() === 'true',
    fileSizeLimit: (process.env['LOGGER_FILE_SIZE_LIMIT'] || '20M') as FileSize,
    fileExpiredIn: (process.env['LOGGER_FILE_EXPIRED_IN'] || '14d') as Interval,
    compress: (process.env['LOGGER_FILE_COMPRESS'] as string).toLowerCase() === 'true'
  },
  i18n: {
    fallbackLng: process.env['I18N_FALLBACK_LANGUAGE'] || 'zh',
    localePath: process.env['I18N_LOCALE_PATH'] || '/backends/portal/assets/i18n'
  },
  throttler: {
    ttl: parseInt(process.env['THROTTLER_TTL'] as string, 10) || 60000, // 60秒
    limit: parseInt(process.env['THROTTLER_LIMIT'] as string, 10) || 10, // 最大请求数
    storage: {
      type: (process.env['THROTTLER_STORAGE'] as 'memory' | 'redis') || 'memory', // 存储方式
      redis: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] as string, 10) || 6379,
        password: process.env['REDIS_PASSWORD'] || '',
        db: parseInt(process.env['THROTTLER_DB_INDEX'] as string, 10) || 2
      }
    }
  },
  email: {
    from: process.env['RESEND_EMAIL_FROM'] || 'noreply@domain.com',
    apiKey: process.env['RESEND_EMAIL_API_KEY'] || '',
    endpoint: process.env['RESEND_EMAIL_ENDPOINT'] || ''
  },
  storage: {
    accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'] || 'storage_access_key_id',
    accessKeySecret: process.env['STORAGE_ACCESS_KEY_SECRET'] || 'storage_access_key_secret',
    bucket: process.env['STORAGE_BUCKET'] || 'ray',
    region: process.env['STORAGE_REGION'] || 'us-east-1',
    endpoint: process.env['STORAGE_ENDPOINT'] || 'localhost'
  },
  sms: {
    accessKeyId: process.env['SMS_ACCESS_KEY_ID'] || 'sms_access_key_id',
    accessKeySecret: process.env['SMS_ACCESS_KEY_SECRET'] || 'sms_access_key_secret',
    signName: process.env['SMS_SIGN_NAME'] || 'sms_sign_name'
  },
  rabbitmq: {
    uri: process.env['RABBITMQ_URI'] || 'amqp://localhost:5672',
    exchangeName: process.env['RABBITMQ_EXCHANGE_NAME'] || 'core',
    exchangeType: (process.env['RABBITMQ_EXCHANGE_TYPE'] as 'direct' | 'topic' | 'fanout') || 'direct'
  },
  elasticsearch: {
    host: process.env['ELASTICSEARCH_HOST'] || 'localhost',
    port: parseInt(process.env['ELASTICSEARCH_PORT'] as string, 10) || 9200,
    apiKey: process.env['ELASTICSEARCH_API_KEY'] || 'elastic',
    maxRetries: parseInt(process.env['ELASTICSEARCH_MAX_RETRIES'] as string, 10) || 3,
    requestTimeout: parseInt(process.env['ELASTICSEARCH_REQUEST_TIMEOUT'] as string, 10) || 30000,
    dataIndex: process.env['ELASTICSEARCH_DATA_INDEX'] || 'neo_data'
  }
}

export const AppConfig = (): Config => config
