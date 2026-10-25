# 上线配置与发布流程

当前是后端框架的发布基线，**不是已经验收的电商产品**。真实身份认证、权限、下单、库存、支付以及监控告警仍需开发或接入。`deploy/release-readiness.json` 故意保持未通过状态，不得为绕过检查而填写虚假证据。

## 分支与远端

- `main`：稳定发布基线；本次上线配置和现有框架一并纳入版本管理。
- `develop`：从这次 main 的提交创建，后续开发在此开展；功能较大时再从 develop 建 feature 分支。
- 开发合并到 develop，集成验收后经 PR 合并 main；紧急修复合入 main 后同步 develop。
- 项目仓库为 [Akarin7784/selfmall](https://github.com/Akarin7784/selfmall)，默认分支为 main。维护者应保护 main，禁止强推/删除，要求审核及 `verify` 检查通过。GitButler 自动创建的 `gb-local` 是本地管理远端，不是 GitHub/GitLab 远端。

仓库保护规则和 GitHub Environment 的审批人不能通过这些文件自动生效，管理员需在远端设置。不要直接在 main 上持续开发。

## 构建与制品

1. 在 main 完成版本兼容性和依赖安全升级，执行 Maven verify、端到端测试及 Kustomize 检查。当前 Boot/Cloud 基线仍需经过实际漏洞扫描，不能以“能构建”代替安全审核。
2. GitHub 上创建 `release-images` Environment，配置保护规则和 `JAVA_IMAGE` 变量，值为批准的 Java 21 Linux JRE 镜像完整 digest（如 `eclipse-temurin@sha256:<64位真实摘要>`）。允许 GITHUB_TOKEN 写入 GHCR Packages。仓库无 GitHub 环境时，可以在自建 CI 执行等价步骤。
3. 从 main 手动运行 `release-images` 工作流。执行测试后构建七个镜像，对 HIGH/CRITICAL 漏洞阻断发布，生成 CycloneDX SBOM，再推送 GHCR，并保存 digest/扫描报告。
4. 以 **全部七个镜像任务通过** 为一次完整制品发布。部分任务失败时可能已有部分镜像推送，不能将它们当作完整发布。
5. 将 prod Kustomization 中每个 `images` 项改为实际 `newName` 和 `digest: sha256:...`，移除 `newTag`。使用同一次发布产生的七个 digest，保留报告与完整 Git SHA。

工作流只生成镜像，不自动修改生产集群，也不宣称业务验收通过。镜像以 Git SHA 标记，项目 Maven 版本暂仍为 `0.1.0-SNAPSHOT`，正式产品发布时再按团队版本规则更新；真正部署身份以 digest 和 Git SHA 为准。

## 生产环境清单

替换 prod 的 Nacos/MySQL/Redis/Sentinel 地址、Nacos namespace ID、域名和 Ingress class。Secret 分别为 `mall-common-secrets`、`mall-product-secrets`、`mall-tls` 和 `mall-registry`（私有仓库拉取凭据）。在 Secret 管理系统中维护，禁止将值放入 ConfigMap 或发布包。

网络默认拒绝入站，只允许 Ingress controller → gateway、gateway → 业务服务、order → product、Sentinel → 客户端 8719。需将 `ingress-nginx`、controller 标签、`infrastructure` 和 Sentinel 标签替换为实际值，并在支持 NetworkPolicy 的 CNI 上实测。出站目前不隔离；连接外部托管中间件时应按实际网段制定出站白名单。参考 [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)。

prod namespace 启用 Restricted Pod Security，预设资源配额；确认集群版本、Metrics Server、Ingress controller、至少两个可用节点和容量。HPA/PDB 只能处理副本管理，不能替代中间件高可用。

结构化 JSON 控制台日志已启用。接入集群日志采集，避免记录密码、Authorization 和支付敏感信息。监控须至少包括：Pod 重启/就绪数、CPU/内存、网关 5xx/延迟、服务错误率、数据库连接与备份、Nacos/Redis 可用性。当前没有预装 Prometheus/Grafana，也没有业务指标；告警阈值、通知渠道和值班负责人需在验收记录中提供证据。

`deploy/monitoring/alerts.yml` 提供副本不可用、反复重启、内存接近上限和监控数据缺失的 Prometheus 规则。将其接入现有 Prometheus `rule_files`；依赖 kube-state-metrics 和 kubelet/cAdvisor 指标。使用实际 Prometheus 版本的 `promtool check rules` 校验并演练告警通知后生效；本地没有 Prometheus，尚未执行该规则工具或验证通知链路。网关业务延迟/错误率等应用指标仍需接入。

## 数据库迁移

prod 商品服务关闭启动自动迁移，应用账号只保留业务所需权限；独立迁移账号执行 DDL，不注入运行 Pod。

在能访问目标 MySQL 的受控机器上，切到待发布的同一提交，通过密钥系统注入 `MIGRATION_MYSQL_URL`、`MIGRATION_MYSQL_USERNAME`、`MIGRATION_MYSQL_PASSWORD`。先完成可恢复备份，再执行：

```powershell
.\scripts\migrate-production.ps1 info
.\scripts\migrate-production.ps1 validate
.\scripts\migrate-production.ps1 migrate
```

Linux 对应 `bash mvnw -B -pl mall-product -Pdb-migrate flyway:info`、`flyway:validate`、`flyway:migrate`。不要加 `-X` 或输出环境变量，避免日志暴露连接信息。

插件与 Spring Boot 管理的 Flyway/MySQL 版本保持一致，仅加载 `db/migration`，不会插入 `db/local` 示例商品。禁止 clean。已发布迁移文件不可改写，只新增更高版本；采用先扩展、后收缩的兼容迁移策略。迁移失败立即停止发布，不自动回滚 SQL，不自动执行 repair。

## 发布前检查与执行

从准备发布的版本渲染文件，并在部署仓库/发布工单中记录准确 commit 的验收证据（不能用本文件自身提交的 SHA 造成循环依赖，可在外部发布记录中维护）：

```powershell
New-Item -ItemType Directory -Force release-output | Out-Null
kubectl kustomize deploy/k8s/overlays/prod > release-output/prod.yaml
python scripts/release-preflight.py --manifest release-output/prod.yaml --commit <发布提交SHA> --readiness <该版本验收JSON路径>
kubectl --context <明确的生产context> apply --dry-run=server -f release-output/prod.yaml
```

检查会拒绝：示例地址、未固定 digest 的镜像、混入发布包的 Secret、缺少 TLS 域名、缺失服务、错误 namespace、未完成/无证据/与提交不一致的验收。它只检查文件和证据字段，不替代真实人工验收或漏洞扫描结果审查。仓库中的默认配置预期被拒绝。

namespace、Secret、迁移、中间件、Ingress 和备份就绪后才发布：

```powershell
kubectl --context <明确的生产context> apply -f release-output/prod.yaml
kubectl --context <明确的生产context> -n selfmall-prod rollout status deployment/mall-gateway --timeout=600s
kubectl --context <明确的生产context> -n selfmall-prod get deployments,pods,hpa,pdb,ingress
```

逐一检查其余六个 Deployment 的 rollout，验证 HTTPS、登录/权限、商品、库存、真实交易验收用例，观察延迟/错误率和告警。不能仅通过网关健康检查判定上线成功。

## 备份与回滚

- 在发布前记录当前所有 Deployment 的 image digest、ConfigMap/Nacos 配置版本、数据库迁移版本、备份编号和恢复点。
- MySQL 使用托管备份/PITR 或独立备份任务，设置保留期、加密和跨故障域存储，并在隔离数据库完成恢复演练。Redis 的持久化/备份按是否承载业务状态决定。备份账号与应用账号分离。
- 应用失败时停止扩大发布，重新部署上一份完整的 manifest/digest 集合；紧急单服务可用 `kubectl rollout undo`，但它不会回滚 Secret、Nacos 配置或数据库。
- 迁移应兼容旧应用；数据库损坏或不兼容变更时由负责人依据恢复演练和业务恢复点执行恢复，避免自动删库/逆向 SQL。
- 保存发布日志、SBOM、扫描报告、验收报告和回滚结果；资源配额和探针阈值按压测结果调整。

当前尚未提供真实生产参数和集群连接，也未实际发布/迁移/恢复；这些必须在真实环境完成。
