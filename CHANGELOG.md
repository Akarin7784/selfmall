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

### Known limitations

- 尚未实现真实身份体系、下单、扣库存、支付与前端。
- 尚未完成生产集群联调、真实镜像漏洞扫描及业务验收。
