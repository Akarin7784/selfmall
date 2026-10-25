# SelfMall 前端

买家端（H5 + PC Web 同一套响应式代码）与共享接口客户端。运营后台 `apps/admin`（Element Plus）在 FE-08 再建。

> 当前为 FE-01 工程骨架：只有构建、lint、类型检查和测试，没有业务页面。

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
├── packages/api/           类型化接口客户端 @selfmall/api（FE-03 实现）
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

- 验收宽度：375px 与 1280px，两者都要检查。
- 导航：手机上收成底部栏或抽屉，平板/PC 用顶部导航。

## 编码约定

- 金额：后端返回 JSON 数字（BigDecimal），解析时保留原文，按字符串或定点数处理，**不做浮点运算**；总价以服务端 `totalAmount` 为准，前端不自己乘。
- 令牌：只存 `localStorage`，**不写入日志或错误上报**；目前没有刷新令牌，401 时清除令牌并跳转登录页。
- 错误：业务错误一般是 `ApiResponse`（`code`、`message`、`data`），网关和框架层错误可能不是，请求封装不能假定统一结构。
- 缩进 2 空格、UTF-8、LF，见 `frontend/.editorconfig`。
