# 开发与测试

## 分支

`main` 保存稳定基线，`develop` 用于开发集成。功能 PR 默认提交到 develop，发布整理后再合入 main。完整流程见 [贡献指南](https://github.com/Akarin7784/selfmall/blob/main/CONTRIBUTING.md)。

## 验证矩阵

| 命令 | 覆盖范围 | 依赖 |
| --- | --- | --- |
| `bash mvnw clean verify` | Java 编译、集成测试、打包 | JDK 21 |
| `python scripts/smoke-test.py` | 七服务实际启动及完整示例调用链 | JDK 21、Python、已打包 JAR |
| `python scripts/validate-k8s.py` | Kustomize 渲染与跨资源引用 | kubectl、PyYAML |
| `python -m unittest discover -s scripts -p 'test_*.py'` | 发布检查器 | PyYAML |
| `python -m mkdocs build --strict` | 文档生成与链接校验 | 文档依赖 |

Windows 使用 `./mvnw.cmd`。冒烟检查占用 8080、9000–9005，执行前停止手动启动的服务。默认测试不会访问生产环境；日志在忽略提交的 `.tools/` 中。

## 文档开发

```sh
python -m venv .venv-docs
# Linux/macOS: source .venv-docs/bin/activate
# PowerShell: .venv-docs/Scripts/Activate.ps1
python -m pip install -r docs-requirements.txt
python -m mkdocs serve
```

访问 `http://127.0.0.1:8000`。修改 `docs/` 内 Markdown，导航在根目录 `mkdocs.yml`。站点构建到 `site/`，不要提交生成文件。

main 的文档更新通过 GitHub Actions 构建并部署到 GitHub Pages；PR 只检查构建，不发布。页面源码与功能代码同仓管理。

## 新增业务

先明确服务边界、请求校验和失败语义，再实现持久化及事务。不要从客户端透传用户 ID 作为权限依据；金额使用 BigDecimal。新增数据库结构通过 Flyway 版本迁移交付，不修改已发布的 SQL。

API 变化同时修改接口文档、测试及 CHANGELOG。未实现或未经验证的能力必须在文档中明确标注。

## 前端 CI

`frontend/**` 变更会触发 `.github/workflows/frontend-ci.yml`，在 `frontend/` 下依次执行 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`（Node 20.19.2，pnpm 版本取自 `package.json` 的 `packageManager`）。CI 构建固定 `VITE_ENABLE_MOCK=false`，示例数据只用于本地开发。提交前可在本地跑同样的命令。
