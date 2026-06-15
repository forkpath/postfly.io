/**
 * 全站品牌标识 —— 单一事实来源。
 *
 * cookie 前缀、storage bucket、token 存储键等本质都是"品牌常量"，
 * 不随运行环境（dev/prod）变化，因此用共享常量而非环境变量。
 * 改名时只改这一处，server / extension / mobile 三端同步生效。
 *
 * - APP_NAME: 展示名（如 better-auth appName、extension manifest、邮件页脚）
 * - APP_SLUG: 小写标识符，用于 cookie 前缀、storage bucket、token 存储键、seed 数据等
 */
export const APP_NAME = 'Ray'

export const APP_SLUG = 'ray'
