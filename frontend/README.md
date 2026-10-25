# SelfMall 前端

买家端（H5 + PC Web 同一套响应式代码）与共享接口客户端。运营后台 `apps/admin`（Element Plus）在 FE-08 再建。

> 当前进度：FE-01 工程骨架已合并；FE-03 实现 `@selfmall/api` 接口客户端。还没有业务页面（FE-04 起）。

## 目录结构

```text
frontend/
├── apps/storefront/        买家端：Vue 3 + Vite + TS strict + Pinia + Vue Router + Element Plus + @tanstack/vue-query
│   ├── public/mockServiceWorker.js   MSW 生成的 worker 脚本（勿手改）
│   └── src/
│       ├── mocks/          MSW 接线（browser.ts、handlers/），默认关闭
│       ├── pages/          页面（目前只有占位首页）
│       ├── router/         路由
│       └── styles/         全局样式与断点
├── packages/api/           类型化接口客户端 @selfmall/api（见下文「接口客户端」）
├── eslint.config.js        ESLint flat config（vue + typescript，格式交给 Prettier）
├── tsconfig.base.json      共享 TS strict 配置
└── pnpm-workspace.yaml
```

## 环境与命令

需要 Node >= 20.19、pnpm 10（版本见 `package.json` 的 `packageManager`）。以下命令都在 `frontend/` 下执行：

| 命令                             | 作用                                              |
| -------------------------------- | ------------------------------------------------- |
| `pnpm install --frozen-lockfile` | 安装依赖                                          |
| `pnpm dev`                       | 启动买家端开发服务器                              |
| `pnpm lint`                      | ESLint + Prettier 检查                            |
| `pnpm format`                    | Prettier 自动格式化                               |
| `pnpm typecheck`                 | `vue-tsc --noEmit` / `tsc --noEmit`               |
| `pnpm test`                      | Vitest（storefront 用 jsdom + Vue Test Utils）    |
| `pnpm build`                     | 生产构建，产物在 `apps/storefront/dist`（不入库） |

## 开发代理

网关暂无 CORS 配置（BE-CORS 处理中），开发期由 Vite 把 `/api` 转发到网关，默认 `http://localhost:8080`。
可在 `apps/storefront/.env.local`（不入库，参考 `.env.example`）里覆盖：

```bash
VITE_API_PROXY_TARGET=http://localhost:8080
```

## Mock 开关与规则

- `apps/storefront/public/mockServiceWorker.js` 由 MSW **3.0.3** 生成（文件头 `PACKAGE_VERSION = '3.0.3'`，与 `apps/storefront/package.json` 的 `msw: ^3.0.3` 及 lockfile 一致）。升级 MSW 后必须在 `apps/storefront/` 下重新执行 `pnpm dlx msw init public/`（或 `pnpm exec msw init public/`）重新生成该文件，否则 worker 与库版本不匹配。
- `VITE_ENABLE_MOCK=true` 时启动 MSW，默认关闭。handlers 在 `apps/storefront/src/mocks/handlers/`，FE-01 不含任何 mock。
- 只 mock 后端尚未实现的接口；已实现接口（登录、订单试算等）失败时如实展示错误，不能用 mock 掩盖。
- **mock 必须显眼标注**：响应带 `X-Mock: true` 头，页面显示「MOCK 数据」徽标，不得冒充真实数据。
- mock 字段只按后端已给出的字段或草案写，不自造字段名。

## 响应式断点与导航

移动优先，同一套代码适配 H5 与 PC，断点定义在 `apps/storefront/src/styles/breakpoints.css`（及 `breakpoints.ts`）：

| 范围            | 设备 |
| --------------- | ---- |
| 默认（< 768px） | 手机 |
| >= 768px        | 平板 |
| >= 1200px       | PC   |

- 验收宽度：375px 与 1280px，两者都要检查。浏览器实测随第一个业务页面放到 FE-04 做（FE-01/FE-03 没有页面可验）。
- 导航：手机上收成底部栏或抽屉，平板/PC 用顶部导航。

## 接口客户端 `@selfmall/api`

不引入第三方依赖，基于 `fetch`。所有方法返回解包后的 `data`，失败一律抛 `ApiError`。

```ts
import { createApiClient, isApiError, formatMoney } from '@selfmall/api'

const api = createApiClient({
  // baseUrl 默认 '/api'（API_BASE_PATH），开发期走 Vite 代理
  // fetch 默认 globalThis.fetch，测试里注入假实现
  // tokenStore 默认 createTokenStore()：localStorage，不可用时退回内存
  timeoutMs: 15_000, // 默认 15s
  onUnauthorized: () => {
    /* 由应用接线，见下文 */
  },
})

const products = await api.listProducts({ page: 0, size: 20 }) // Product[]，不含总数
const product = await api.getProduct(1)
await api.login({ username: 'demo', password: '...' }) // 成功后自动写入令牌
const quote = await api.quoteOrder({ productId: 1, quantity: 2 })
const me = await api.getCurrentMember() // { memberId }
api.logout() // 清除本地令牌
```

| 方法                               | 接口                     | 鉴权   | 客户端校验                                    |
| ---------------------------------- | ------------------------ | ------ | --------------------------------------------- |
| `login({username,password})`       | `POST /api/auth/token`   | 无     | 用户名、密码非空                              |
| `listProducts({page,size})`        | `GET /api/products`      | 无     | page 0–10000（默认 0），size 1–100（默认 20） |
| `getProduct(id)`                   | `GET /api/products/{id}` | 无     | id 为正整数                                   |
| `quoteOrder({productId,quantity})` | `POST /api/orders/quote` | Bearer | productId 正整数，quantity 1–99               |
| `getCurrentMember()`               | `GET /api/members/me`    | Bearer | —                                             |

校验不通过时抛 `kind: 'invalid-argument'`（`httpStatus: null`），**不发请求**。2xx 但响应不是统一格式或字段不符合约定时抛 `invalid-response`。

### 错误分类

`ApiError` 字段：`kind`、`httpStatus`（客户端错误为 `null`）、`code`（后端错误码；非统一格式时为 `HTTP_<状态码>`；客户端错误为 `CLIENT_<KIND>`）、`message`、`retryAfterMs?`。

| kind                  | 触发条件                                              | 页面建议             |
| --------------------- | ----------------------------------------------------- | -------------------- |
| `invalid-argument`    | 400，或客户端参数校验失败                             | 提示参数错误         |
| `unauthenticated`     | 受保护接口本地无令牌（不发请求）                      | 跳登录               |
| `unauthorized`        | 401                                                   | 跳登录               |
| `forbidden`           | 403                                                   | 提示无权限，不清令牌 |
| `not-found`           | 404                                                   | 空态/商品不存在      |
| `rate-limited`        | 429，`retryAfterMs` 来自 `Retry-After`                | 稍后重试             |
| `service-unavailable` | 503（如试算时商品服务不可用），可能有 `retryAfterMs`  | 稍后重试             |
| `server-error`        | 其他 5xx，或 2xx 但业务码非 OK（如 `INTERNAL_ERROR`） | 通用错误             |
| `http-error`          | 其他未单独分类的状态码                                | 通用错误             |
| `network`             | fetch 抛错（断网、DNS、CORS）                         | 检查网络             |
| `timeout`             | 超过 `timeoutMs`，请求被中止                          | 重试                 |
| `invalid-response`    | 2xx 但不是统一格式或字段不符                          | 通用错误             |

- 错误响应是 HTML、纯文本、空 body、Spring Security/网关框架 JSON 时不会抛解析异常，按状态码分类，`message` 用内置中文默认文案，不回显原始 body。
- `Retry-After` 支持整数秒和 HTTP 日期（IMF-fixdate），换算成毫秒并夹在 `[0, 5 分钟]`（`maxRetryAfterMs` 可调），无法解析时为 `undefined`。

### 令牌规则

- 只存 `localStorage`，key 固定为 `selfmall.accessToken`；没有 `localStorage` 或读写抛错时退回内存，不崩溃。
- 本包任何地方不打印令牌；`ApiError` 不挂底层异常对象，后端消息里若回显令牌会替换成 `[REDACTED]`。
- 没有刷新令牌。**受保护接口在本地无令牌时直接抛 `unauthenticated` 并调用 `onUnauthorized`，不发请求**；受保护接口返回 401 时先清令牌，再调用 `onUnauthorized`。
- 公开接口（含登录）的 401 只抛 `unauthorized`：登录密码错误不会清除已有令牌、也不会触发跳转。
- 403 不清令牌。

### onUnauthorized 接线（FE-05 落地，本 PR 不接页面）

storefront 目前没有登录页，接线放到 FE-05。建议在应用层创建单例：

```ts
// apps/storefront/src/api.ts
import { createApiClient } from '@selfmall/api'
import router from './router'

export const api = createApiClient({
  onUnauthorized: () => {
    const current = router.currentRoute.value
    if (current.name !== 'login') {
      void router.replace({ name: 'login', query: { redirect: current.fullPath } })
    }
  },
})
```

### 金额规则

- 后端金额是 JSON 数字（如 `99.00`）。客户端在 `JSON.parse` 之前用字符串扫描器把金额字段的数字字面量原样包成字符串（`99.00` → `"99.00"`，`99.1` → `"99.1"`），已经是字符串的保持不变；扫描会跳过字符串字面量内部。默认字段 `price`、`unitPrice`、`totalAmount`，可用 `moneyFields` 配置。不依赖 `JSON.parse` reviver 的 `source` 参数（Node 20 不支持）。
- 金额工具全部用字符串/BigInt：`isMoneyString`、`formatMoney`（规范为两位小数）、`compareMoney`、`addMoney`、`toCents`/`fromCents`。拒绝科学计数法、正号、空格和千分位；超过两位小数且多出部分非零时抛 `MoneyError`，不隐式舍入。
- 总价以服务端 `totalAmount` 为准，前端不自己乘；`addMoney` 只用于展示性汇总。

## 编码约定

- 金额：后端返回 JSON 数字（BigDecimal），解析时保留原文，按字符串或定点数处理，**不做浮点运算**；总价以服务端 `totalAmount` 为准，前端不自己乘。
- 令牌：只存 `localStorage`，**不写入日志或错误上报**；目前没有刷新令牌，401 时清除令牌并跳转登录页。
- 错误：业务错误一般是 `ApiResponse`（`code`、`message`、`data`），网关和框架层错误可能不是，请求封装不能假定统一结构。
- 缩进 2 空格、UTF-8、LF，见 `frontend/.editorconfig`。
