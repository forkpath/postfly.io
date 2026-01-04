import { prisma } from './prisma'

async function main() {
  console.log(`${prisma}:通过seed.ts定义初始化数据`)
}

main().catch(e => console.log(e))
