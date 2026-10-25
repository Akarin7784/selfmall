# 贡献指南

欢迎提交文档修正、问题报告和代码贡献。参与前请阅读 [行为准则](CODE_OF_CONDUCT.md)。

## 提交问题

先搜索已有 Issues。Bug 请提供提交 SHA、运行模式、系统/JDK 版本、复现步骤、期望/实际结果和脱敏日志。功能建议请说明业务场景和服务边界。安全漏洞不要公开披露，参见 [SECURITY.md](SECURITY.md)。

## 开发流程

1. Fork 仓库，从 `develop` 创建功能分支。
2. 保持变更聚焦，不提交 IDE 文件、target、凭据、私钥或运行日志。
3. 修改行为时增加有意义的测试，同步文档与 CHANGELOG。
4. 执行 `./mvnw.cmd clean verify`（Windows）或 `bash mvnw clean verify`。部署改动还需执行 `python scripts/validate-k8s.py`；文档改动执行 `python -m mkdocs build --strict`。
5. 向 `develop` 提交 PR，填写变更原因、验证结果和回滚影响。

`main` 保存发布基线。依赖升级须核对 Spring Boot/Cloud/Alibaba 兼容关系，不能仅按单包最新版本升级。数据库迁移必须向前兼容，不修改已发布迁移。

## 代码约定

使用 Java 21、UTF-8，遵守 `.editorconfig`。金额使用 BigDecimal，用户身份从已验证凭据获取，API 输入要校验。不要用返回成功或伪造数据的方式掩盖下游失败。

提交信息建议使用 `feat:`、`fix:`、`docs:`、`test:`、`chore:` 等前缀并描述具体变化。不强制签署额外 CLA；提交者应有权贡献所提交内容，贡献内容按项目 MIT 许可证发布。
