# SelfMall 前端

买家端（H5 + PC Web 同一套响应式代码）与共享接口客户端。运营后台 `apps/admin`（Element Plus）在 FE-08 再建。

> 当前进度：FE-01 工程骨架、FE-03 `@selfmall/api` 接口客户端已合并；FE-04 实现买家端商品列表页与详情页。

## 目录结构

```text
frontend/
├── apps/storefront/        买家端：Vue 3 + Vite + TS strict + Pinia + Vue Router + Element Plus + @tanstack/vue-query
│   ├── public/mockServiceWorker.js   MSW 生成的 worker 脚本（勿手改）
│   └── src/
│       ├── mocks/          MSW 接线（browser.ts、handlers/），默认关闭
│       ├── api/            接口客户端单例、vue-query 默认配置、错误文案、价格展示
│       ├── components/     通用组件（商品卡片、错误态）
│       ├── pages/          页面（商品列表、商品详情、404）
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

网关已支持 CORS，默认只允许 `http://localhost:5173` 和 `http://127.0.0.1:5173`；开发期仍可用 Vite 代理把 `/api` 转发到网关，默认 `http://localhost:8080`。配置见 `docs/api.md`「跨域（CORS）」一节。
可在 `apps/storefront/.env.local`（不入库，参考 `.env.example`）里覆盖：

```bash
VITE_API_PROXY_TARGET=http://localhost:8080
```

## Mock 开关与规则

- `apps/storefront/public/mockServiceWorker.js` 由 MSW **3.0.3** 生成（文件头 `PACKAGE_VERSION = '3.0.3'`，与 `apps/storefront/package.json` 的 `msw: ^3.0.3` 及 lockfile 一致）。升级 MSW 后必须在 `apps/storefront/` 下重新执行 `pnpm dlx msw init public/`（或 `pnpm exec msw init public/`）重新生成该文件，否则 worker 与库版本不匹配。
- `VITE_ENABLE_MOCK=true` 时启动 MSW，默认关闭。handlers 在 `apps/storefront/src/mocks/handlers/`；目前只有 FE-09 的商品示例数据（见下节）。
- 除经确认的示例数据（FE-09 商品列表/详情）外，只 mock 后端尚未实现的接口；已实现接口（登录、订单试算等）失败时如实展示错误，不能用 mock 掩盖。
- **mock 必须显眼标注**：响应带 `X-Mock: true` 头，页面显示「MOCK 数据」徽标，不得冒充真实数据。
- mock 字段只按后端已给出的字段或草案写，不自造字段名。

## 示例数据（FE-09，非真实商品）

开发演示用的电脑配件示例数据，**示例数据，非真实商品**：名称是通用类型描述（不含真实品牌、型号），价格是示例值，不是真实价格。

### 怎么开启 mock

```bash
# 打开示例数据（只在本地开发时使用）
VITE_ENABLE_MOCK=true pnpm dev
```

- **默认关闭**：不带该变量（或 `VITE_ENABLE_MOCK=false`，见 `apps/storefront/.env.example`）时直接 `pnpm dev`，不加载 MSW，前端经 Vite 代理（`/api` → `VITE_API_PROXY_TARGET`，默认 `http://localhost:8080`）连真实后端网关。
- CI 与生产构建不开启（CI 显式设为 `false`）。开关判断用 `import.meta.env.VITE_ENABLE_MOCK` 字面量，构建时整段被摇掉，示例数据与 msw 不进生产包。

### 范围与标注

- 数据：`apps/storefront/src/mocks/fixtures/pcParts.ts`，27 条，覆盖 CPU、主板、内存、显卡、固态硬盘、电源、机箱、散热器、显示器 9 类；字段只有 `id`、`skuCode`（`MOCK-` 前缀）、`name`、`price`，不含 `imageUrl`、类目、总数、库存等草案字段，图片位用 CSS 占位块。
- 只 mock `GET /api/products`（`page` 从 0、`size` 1–100，`data` 为数组、不带总数，越界页返回空数组）和 `GET /api/products/{id}`（不存在返回 404 `{"code":"HTTP_404","message":"商品不存在","data":null}`）。`price` 按后端真实形态以 JSON 数字字面量原文发出（如 `1299.00`），由 `@selfmall/api` 的金额预扫描保留为字符串。
- 登录、订单试算、会员等其他请求不拦截（`onUnhandledFrame: 'bypass'`），照常经代理走真实后端；真实接口失败时如实显示错误态。
- 每个 mock 响应带 `X-Mock: true`；列表页和详情页显示「MOCK 数据」徽标（含读屏文本），仅在开关打开时出现。
- 示例数据只存在于前端，不进后端数据库。

## 响应式断点与导航

移动优先，同一套代码适配 H5 与 PC，断点定义在 `apps/storefront/src/styles/breakpoints.css`（及 `breakpoints.ts`）：

| 范围            | 设备 |
| --------------- | ---- |
| 默认（< 768px） | 手机 |
| >= 768px        | 平板 |
| >= 1200px       | PC   |

- 验收宽度：375px 与 1280px，两者都要检查（FE-04 起每个页面 PR 都要做）。
- 导航：手机（< 768px）用固定底部栏，内容区底部留出栏高度；>= 768px 用顶部导航。

## 页面与路由（FE-04）

| 路由               | 页面     | 说明                                                                                                                |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `/`                | —        | 重定向到 `/products`                                                                                                |
| `/products?page=N` | 商品列表 | `GET /api/products`，每页 20 条；`page` 从 1 开始，对应接口 `page=N-1`                                              |
| `/products/:id`    | 商品详情 | `GET /api/products/{id}`；id 不是正整数时直接显示「商品不存在」不发请求；FE-06 起含「价格试算」区，支持 `?qty=1–99` |
| `/login`           | 演示登录 | FE-05；`POST /api/auth/token`，支持 `?redirect=站内路径`；已登录访问会跳走                                          |
| `/me`              | 我的     | FE-05；需要登录，显示登录状态、`memberId` 和「退出登录」                                                            |
| 其他               | 404      | 「页面不存在」并给回商品列表的链接                                                                                  |

- 只展示接口已有的字段：`id`、`skuCode`、`name`、`price`。不展示库存、图片、描述、类目，图片位置是纯 CSS 占位块（`aria-hidden`）。订单试算见「订单试算（FE-06）」一节。
- 分页：接口不返回总数，只有「上一页 / 下一页」。返回条数 < 20 视为最后一页；正好 20 条时下一页可点，下一页为空显示「这一页没有商品了」空态。URL 页码非整数、< 1 或 > 10001（接口上限 10000）时自动改写到合法范围。
- 价格：`displayPrice()` 纯字符串补零到两位并加「¥」（`99.00` → `¥99.00`，`1299.5` → `¥1299.50`，`199` → `¥199.00`）；超过两位小数原样保留（`0.105` → `¥0.105`），不四舍五入、不截断；全程字符串/BigInt，不经浮点数；非法金额原样展示。
- 数据层：`@tanstack/vue-query`，默认配置在 `src/api/query.ts`：network/timeout/server-error/service-unavailable 最多重试 1 次，其余（4xx、429、invalid-response）不重试；列表用 `keepPreviousData`，翻页时保留上一页内容直到新数据到达。
- 客户端单例 `src/api/client.ts`（baseUrl `/api`），通过 `installApiClient(app)` provide，组件里 `useApiClient()` 获取；测试注入假客户端。`onUnauthorized` 在 FE-05 接线，见「登录与会话」。

### 状态与错误文案

| 状态                  | 表现                                                        |
| --------------------- | ----------------------------------------------------------- |
| 加载                  | 骨架屏，`aria-busy="true"`、`role="status"`                 |
| 空                    | 「暂无商品」/「这一页没有商品了」，`role="status"`          |
| `network` / `timeout` | 网络异常，请重试                                            |
| `rate-limited`        | 请求过于频繁，请 N 秒后重试（N 由 `retryAfterMs` 向上取整） |
| `service-unavailable` | 服务暂时不可用，请稍后重试                                  |
| `server-error`        | 服务器出错了，请稍后重试                                    |
| 其他                  | 加载失败，请重试                                            |
| 详情 `not-found`      | 商品不存在或已下架 + 返回商品列表链接                       |

错误态都是 `role="alert"` 并带「重试」按钮，不会用假数据兜底。

### 无障碍

`header` / `nav`（带 `aria-label`）/ `main` 地标与跳转链接；`document.title` 随路由更新（`商品列表 - SelfMall` 等）；导航当前项 `aria-current="page"`；路由切换后焦点移到页面 `h1`；卡片是链接，可 Tab 聚焦，全局 `:focus-visible` 描边；可点元素最小 44×44px。

### 浏览器验收方式

后端不在本机时，可在仓库外起一个临时桩服务，按 `docs/api.md` 的统一格式返回 `/api/products` 与 `/api/products/{id}`（含 404、503、429、慢响应），用 `VITE_API_PROXY_TARGET=http://localhost:<桩端口> pnpm dev` 启动，再用 Playwright 在 375px 与 1280px 下检查：`document.documentElement.scrollWidth <= innerWidth`、底部栏不遮挡内容、触控目标 >= 44px、各状态显示正确。桩服务与截图都不入库。

## 登录与会话（FE-05）

- **演示登录**：`/login` 只对接后端 local 模式的 `POST /api/auth/token`（demo 用户），走真实接口，**不 mock**；cloud 模式没有这个接口。页面标明「演示登录」，不是真实账号体系，不做注册、刷新令牌、角色、会员等级与积分。
- **demo 密码**：由后端环境变量配置，**请向后端维护者索取**；代码和文档里不写密码，登录页不预填。
- **令牌存储**：沿用 `@selfmall/api` 的 token store，只存 `localStorage`，key 为 `selfmall.accessToken`；不打日志。密码只在提交时传给接口，不存储、不进 Pinia、不进日志或错误信息。前端不解码 JWT，身份与权限以后端为准。
- **会话 store**（`src/session/store.ts`，Pinia）：`isLoggedIn` 以 token store 为准，`login()`、`logout()`；退出清令牌并回到登录页。
- **路由守卫**：`meta.requiresAuth` 的路由（目前只有 `/me`）未登录时跳 `/login?redirect=原页`，登录成功回原页；`redirect` 只接受站内路径（单个 `/` 开头，拒绝 `//`、反斜杠、协议、路径首段含冒号（如 `/javascript:x`，FE-06 收紧）、控制字符及其百分号编码形式，见 `src/session/redirect.ts`），非法时回 `/products`。已登录访问 `/login` 直接跳走。商品页保持公开。
- **过期处理**：令牌有效期 3600 秒，没有刷新令牌。过期后受保护接口由网关返回 401，客户端先清令牌，再经 `onUnauthorized`（`src/api/client.ts` → `src/session/unauthorized.ts` → `App.vue`）同步会话并跳 `/login?redirect=当前路径&reason=expired`，登录页显示「登录已过期，请重新登录」（`role="status"`）。并发多个 401 只跳一次，已在登录页不重复跳。登录接口本身的 401（用户名或密码错误）不清令牌、不跳转。
- **错误文案**：401 用户名或密码错误；400 请填写用户名和密码（前端也做空值校验）；429 尝试过于频繁，请 N 秒后重试（`Retry-After`）；网络/超时 网络异常，请检查网络后重试；5xx/503 登录服务暂时不可用；其他 登录失败。错误用 `role="alert"` + `aria-live` 播报并获得焦点。
- **导航**：未登录时顶部导航和手机底部栏显示「登录」，已登录显示「我的」。
- **mock 与登录**：`VITE_ENABLE_MOCK=true` 时 MSW 只拦商品接口，**登录请求仍经 Vite 代理到真实后端**（`VITE_API_PROXY_TARGET`，默认 `http://localhost:8080`）。本地没有起后端时，开了 mock 也登录不了（显示网络或服务错误），这是预期行为，不是页面坏了。

## 订单试算（FE-06）

- **范围**：商品详情页的「价格试算」区只对接 `POST /api/orders/quote`（请求 `{productId, quantity}`，响应 `data` 为 `{memberId, productId, quantity, unitPrice, totalAmount}`），走真实接口，**不 mock**。仅试算价格：不创建订单、不预占库存，未计优惠、运费、税费。不含购物车、下单、收银台（FE-07）。
- **需要登录**：未登录点「试算」跳 `/login?redirect=/products/:id?qty=N`，登录后回到该商品页并恢复数量，**不自动发起试算**，由用户再点。`qty` 只接受 1–99 的整数字符串（`^[1-9][0-9]?$`），其他（`0`、`100`、`1.5`、` 2`、`02`、`1e1`、数组形式、超长串等）一律回退为 1。试算时令牌过期（401）走 `onUnauthorized` 跳登录页。
- **数量**：步进器 + 输入框，1–99 整数，前端校验后才发请求；数量改动立即清掉旧结果；重复点击在请求中被忽略，数量变化后晚到的旧响应丢弃，只展示最新一次。
- **金额按服务端原文**：`unitPrice`、`totalAmount` 由 `@selfmall/api` 无损保留为字符串，经 `displayPrice()` 纯字符串补零到两位（`99.5` → `¥99.50`、`199` → `¥199.00`），超过两位保留，不四舍五入、不截断；前端不做浮点运算、不自己乘合计，合计以服务端 `totalAmount` 为准。试算失败（含商品下架/不存在）如实显示错误，不用详情页价格兜底计算。
- **错误文案**：400 试算参数不合法；404 商品不存在或已下架，无法试算；429 请求过于频繁，请 N 秒后重试（`Retry-After`，网关目前未限流）；网络/超时 网络异常，可重试；503 服务暂时不可用，可重试；其他 5xx 服务器出错了，可重试；其他 试算失败。错误 `role="alert"` 并获得焦点；试算中按钮禁用，`role="status"` 播报「正在试算…/试算完成/试算失败」，结果区 `aria-live="polite"`。
- **mock 与试算**：`VITE_ENABLE_MOCK=true` 时 MSW 不拦 `/api/orders/quote`（`passthrough.test.ts` 断言），试算仍经 Vite 代理到真实后端，**需要真实后端和登录**；没起后端时会显示网络或服务错误，这是预期行为。
- **主题色**：`src/styles/main.css` 用 `:root:root` 全局覆盖 Element Plus `--el-color-primary` 系列为 `#1d4ed8`（hover `#1e40af`、active `#1e3a8a`），主按钮白字对比度 6.70:1 / 8.72:1 / 10.36:1（WCAG 相对亮度公式，见 `src/styles/theme.test.ts`）；禁用态 `#6b7fc4` 为 3.85:1，WCAG 对禁用控件不作要求。

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

### onUnauthorized 接线

已在 FE-05 落地，见上文「登录与会话（FE-05）」。

### 金额规则

- 后端金额是 JSON 数字（如 `99.00`）。客户端在 `JSON.parse` 之前用字符串扫描器把金额字段的数字字面量原样包成字符串（`99.00` → `"99.00"`，`99.1` → `"99.1"`），已经是字符串的保持不变；扫描会跳过字符串字面量内部。默认字段 `price`、`unitPrice`、`totalAmount`，可用 `moneyFields` 配置。不依赖 `JSON.parse` reviver 的 `source` 参数（Node 20 不支持）。
- 注意：金额扫描只按字段名匹配（默认 `price`、`unitPrice`、`totalAmount`），不看语义。将来新增金额字段，或出现同名但不是金额的字段，需要通过 `moneyFields` 配置调整，否则前者会按浮点数解析、后者会被误转成字符串。
- 金额工具全部用字符串/BigInt：`isMoneyString`、`formatMoney`（规范为两位小数）、`compareMoney`、`addMoney`、`toCents`/`fromCents`。拒绝科学计数法、正号、空格和千分位；超过两位小数且多出部分非零时抛 `MoneyError`，不隐式舍入。
- 总价以服务端 `totalAmount` 为准，前端不自己乘；`addMoney` 只用于展示性汇总。

## 编码约定

- 金额：后端返回 JSON 数字（BigDecimal），解析时保留原文，按字符串或定点数处理，**不做浮点运算**；总价以服务端 `totalAmount` 为准，前端不自己乘。
- 令牌：只存 `localStorage`，**不写入日志或错误上报**；目前没有刷新令牌，401 时清除令牌并跳转登录页。
- 错误：业务错误一般是 `ApiResponse`（`code`、`message`、`data`），网关和框架层错误可能不是，请求封装不能假定统一结构。
- 缩进 2 空格、UTF-8、LF，见 `frontend/.editorconfig`。
