# Kubernetes 部署

完整步骤已集中到 [Kubernetes 部署文档](../../docs/kubernetes.md)。

- `base/`：公共 Deployment、Service 和配置。
- `overlays/dev/`：单副本开发环境。
- `overlays/prod/`：生产发布配置、HPA/PDB、网络策略和配额。
- `secrets/`：凭据字段示例，实际文件不得提交。

生产发布需同时阅读 [发布与回滚](../../docs/RELEASE.md)。
