/**
 * 示例数据，非真实商品（FE-09）。
 *
 * - 仅在 VITE_ENABLE_MOCK=true 时由 MSW 使用，不进后端数据库，不打进生产包。
 * - 名称是通用类型描述，不对应任何真实品牌或型号；价格是示例值，不是真实价格。
 * - 字段只用后端已有的 id、skuCode、name、price（两位小数字符串）；不加任何草案字段。
 */
import type { Product } from '@selfmall/api'

/** 9 个配件类别，用 skuCode 前缀区分（类别不是后端字段，仅用于校验覆盖面）。 */
export const PART_CATEGORIES = [
  'CPU',
  'MB',
  'RAM',
  'GPU',
  'SSD',
  'PSU',
  'CASE',
  'COOLER',
  'MON',
] as const

const raw: Array<[string, string, string]> = [
  ['CPU', '入门 4 核桌面处理器', '499.00'],
  ['CPU', '中端 6 核桌面处理器', '1299.00'],
  ['CPU', '高端 12 核桌面处理器', '3499.00'],
  ['MB', '紧凑型 M-ATX 主板', '599.00'],
  ['MB', '标准 ATX 主板', '1099.00'],
  ['MB', '迷你 ITX 主板', '1399.00'],
  ['RAM', '16GB 双通道内存套装', '299.00'],
  ['RAM', '32GB 双通道内存套装', '599.00'],
  ['RAM', '64GB 高频内存套装', '1299.00'],
  ['GPU', '入门级独立显卡 8GB', '1599.00'],
  ['GPU', '中端独立显卡 12GB', '2999.00'],
  ['GPU', '高端独立显卡 16GB', '6499.00'],
  ['SSD', '500GB NVMe 固态硬盘', '259.00'],
  ['SSD', '1TB NVMe 固态硬盘', '459.00'],
  ['SSD', '2TB NVMe 固态硬盘', '899.00'],
  ['PSU', '550W 铜牌电源', '299.00'],
  ['PSU', '750W 金牌全模组电源', '599.00'],
  ['PSU', '1000W 白金全模组电源', '1199.00'],
  ['CASE', '中塔侧透机箱', '269.00'],
  ['CASE', '紧凑型 M-ATX 机箱', '199.00'],
  ['CASE', '全塔静音机箱', '699.00'],
  ['COOLER', '单塔风冷散热器', '129.00'],
  ['COOLER', '双塔风冷散热器', '299.00'],
  ['COOLER', '240mm 一体式水冷散热器', '499.00'],
  ['MON', '24 英寸 1080p 显示器', '799.00'],
  ['MON', '27 英寸 2K 高刷显示器', '1699.00'],
  ['MON', '32 英寸 4K 显示器', '2999.00'],
]

const counters = new Map<string, number>()

export const PC_PARTS: readonly Product[] = Object.freeze(
  raw.map(([cat, name, price], i) => {
    const n = (counters.get(cat) ?? 0) + 1
    counters.set(cat, n)
    return Object.freeze({
      id: i + 1,
      skuCode: `MOCK-${cat}-${String(n).padStart(2, '0')}`,
      name,
      price,
    })
  }),
)
