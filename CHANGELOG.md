# Changelog

记录对使用者有影响的变化。未发布内容保留在 Unreleased，正式版本发布时补充版本号与日期。

## Unreleased

### Added

- Spring Cloud Alibaba 七服务后端框架和公共模块。
- 商品查询、演示登录、订单试算及会员身份查询。
- local/cloud 配置、Kustomize dev/prod、Docker 镜像与发布验证流程。
- 独立数据库迁移、运维和回滚文档。
- MkDocs 文档站、开源贡献规范、Issue 模板和 MIT 许可证。
- 网关跨域（CORS）支持：来源、方法、请求头、暴露头、预检缓存和凭据均可通过 `mall.gateway.cors.*` 配置，默认只允许本地前端 `5173` 端口，禁止 `*` 通配（BE-CORS）。

### Known limitations

- 尚未实现真实身份体系、下单、扣库存、支付与前端。
- 尚未完成生产集群联调、真实镜像漏洞扫描及业务验收。
