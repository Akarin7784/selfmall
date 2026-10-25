# Changelog

记录对使用者有影响的变化。未发布内容保留在 Unreleased，正式版本发布时补充版本号与日期。

## Unreleased

### Added

- Spring Cloud Alibaba 七服务后端框架和公共模块。
- 商品查询、演示登录、订单试算及会员身份查询。
- local/cloud 配置、Kustomize dev/prod、Docker 镜像与发布验证流程。
- 独立数据库迁移、运维和回滚文档。
- MkDocs 文档站、开源贡献规范、Issue 模板和 MIT 许可证。
- 前端工程骨架 `frontend/`（FE-01）：pnpm workspace、Vue 3 买家端占位、`@selfmall/api` 包骨架、ESLint/Prettier/Vitest 与 MSW 开关，不含业务页面。
- 前端 CI `.github/workflows/frontend-ci.yml`（FE-02）：仅在 `frontend/**` 变更时运行，依次执行 install（frozen lockfile）、lint、typecheck、test、build，构建时强制关闭 MSW 示例数据。
- 网关跨域（CORS）支持：来源、方法、请求头、暴露头、预检缓存和凭据均可通过 `mall.gateway.cors.*` 配置，默认只允许本地前端 `5173` 端口，禁止 `*` 通配；开启凭据时任何 `*` 均拒绝启动（BE-CORS）。
- 前端接口客户端 `@selfmall/api`（FE-03）：统一响应解包与 `ApiError` 错误分类（含非 JSON/框架错误、429 `Retry-After`）、401 清令牌回调、localStorage 令牌存储、金额无损解析与字符串金额工具。
- 买家端商品列表页与详情页（FE-04）：对接 `GET /api/products`、`GET /api/products/{id}`，URL 页码上一页/下一页分页、加载/空/错误（按 `ApiError.kind` 分文案）/重试状态、404 页，手机底部栏与平板/PC 顶部导航的响应式布局，vue-query 数据层，不含示例数据。
- 买家端电脑配件示例数据（FE-09）：MSW mock `GET /api/products` 与 `GET /api/products/{id}`，27 条 9 类通用名称示例商品（非真实商品与价格），只含 `id/skuCode/name/price`；响应带 `X-Mock: true`，列表页与详情页显示「MOCK 数据」徽标；`VITE_ENABLE_MOCK=true` 才开启，默认关闭，CI 与生产构建不包含。
- 买家端登录与会话（FE-05）：`/login` 演示登录页对接 `POST /api/auth/token`（按 `ApiError.kind` 分错误文案、前端空值校验、无障碍播报），令牌沿用 `selfmall.accessToken`，Pinia 会话 store，登录态路由守卫与站内 `redirect` 白名单，需要登录的「我的」页 `/me` 与退出，`onUnauthorized` 接线（401 过期跳登录并回原页，并发去重），导航「登录/我的」入口；不含注册、刷新令牌与角色。

### Known limitations

- 尚未实现真实身份体系、下单、扣库存、支付与前端。
- 尚未完成生产集群联调、真实镜像漏洞扫描及业务验收。
