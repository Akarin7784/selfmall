# Kubernetes 部署

本目录将七个 Spring Boot 服务部署到 Kubernetes，使用 Kustomize 管理 dev/prod 差异。当前未连接实际集群；镜像构建和发布需要可用的 Docker 引擎、镜像仓库及 kubeconfig。

## 目录与运行方式

| 路径 | 用途 |
| --- | --- |
| `base/` | 7 个 Deployment、7 个 ClusterIP Service，以及生成的运行配置 ConfigMap |
| `overlays/dev/` | `selfmall-dev` namespace，每服务一个副本，使用 port-forward 访问 |
| `overlays/prod/` | `selfmall-prod` namespace，双副本、PDB、3 个 HPA、TLS Ingress |
| `secrets/` | 仅提交字段示例，实际 `.env` 文件已被 Git 忽略 |

集群中使用 `cloud,k8s` profile：保留 Nacos 配置中心和 Sentinel，关闭 Nacos 服务注册，网关通过 Kubernetes Service DNS 访问业务服务，订单通过 `http://mall-product:8080` 调用商品服务。这样流量会遵循 Kubernetes readiness 状态，避免绕过未就绪 Pod。没有引入 Spring Cloud Kubernetes，也不需要让应用读取 Kubernetes API。

所有容器统一监听 8080，镜像以 UID 10001 运行。只读根文件系统，`/tmp` 和 `/home/mall` 提供临时可写卷，用于 JVM、Nacos/Sentinel 客户端缓存及日志；这些卷不是业务持久化。应用日志从 `kubectl logs` 获取，生产应接入日志采集。

## 1. 准备基础设施

使用现有或独立部署的 Nacos、MySQL、Redis、Sentinel。应用清单不会启动数据库或创建数据库 PVC，也不会把单机 Docker Compose 自动转成生产中间件。

1. 编辑目标环境 `infrastructure.env`：替换 Nacos 地址/namespace ID、MySQL JDBC URL、Redis、Sentinel 地址。默认 `*.infrastructure.svc.cluster.local` 都是待替换的示例地址，不会自动创建。
2. 在 Nacos 创建独立 namespace（配置值使用实际 **namespace ID**），将 `deploy/nacos/*.yml` 导入该 namespace，Group=`SELF_MALL`，Data ID 与文件名一致。dev/prod 应使用独立实例或独立 namespace、数据库和凭据；示例文件不保证隔离。
3. 预建 `mall_product` 数据库及专用用户。dev/cloud 默认启动时由 Flyway 建表；prod 已关闭启动迁移，需使用独立迁移账号先执行 `db-migrate` Maven profile，详见 [上线流程](RELEASE.md)。运行账号无需 DDL 权限。
4. Nacos 客户端须能访问 8848 和 gRPC 9848（自定义端口时为主端口+1000），MySQL 3306、Redis 6379。Sentinel 控制台还需能访问业务 Pod 的客户端命令端口（默认 8719，健康/路由仍使用 8080）；按实际 CNI、控制台位置配置网络访问。
5. 暂无 Sentinel 控制台时，可在运行 ConfigMap 中显式设置 `SPRING_CLOUD_SENTINEL_ENABLED=false`，不要把不可达地址当成控制台已经接入。

## 2. 构建并推送镜像

以下命令均从项目根目录执行：

```powershell
.\mvnw.cmd clean verify
docker login registry.example.com
.\scripts\build-images.ps1 -Registry registry.example.com/team -Tag v0.1.0 -Push
```

脚本构建七个服务镜像。Dockerfile 默认基础镜像 `eclipse-temurin:21-jre-jammy`，Java 直接作为 PID 1 接收 SIGTERM。生产应将基础镜像锁定为经过验证的 digest；版本升级后重建。

Linux/macOS 等价命令：

```sh
bash mvnw clean verify
for s in gateway auth product inventory order member payment; do
  docker build -f deploy/Dockerfile --build-arg SERVICE=mall-$s \
    -t registry.example.com/team/mall-$s:v0.1.0 .
  docker push registry.example.com/team/mall-$s:v0.1.0
done
```

镜像架构必须匹配集群节点（脚本使用 Docker 当前平台；多架构集群用 buildx 构建）。修改目标 overlay 的 `kustomization.yaml` 中七项 `images.newName/newTag`，匹配实际仓库/tag。生产建议使用不可变 tag 或 image digest。默认 `selfmall/mall-*:0.1.0` 不是已发布的公共镜像。

prod 已引用镜像拉取 Secret `mall-registry`，需在对应 namespace 创建；使用公开仓库时可显式移除此引用。dev 未配置该引用，私有仓库按实际认证方式添加。使用本地 kind/minikube 时，可导入本地镜像后使用默认名称。

## 3. 创建 namespace 和 Secret

先确认连接的是目标集群：

```powershell
kubectl config current-context
kubectl cluster-info
kubectl apply -f deploy/k8s/overlays/dev/namespace.yml
Copy-Item deploy/k8s/secrets/common.env.example deploy/k8s/secrets/common.env
Copy-Item deploy/k8s/secrets/product.env.example deploy/k8s/secrets/product.env
# 编辑这两个 .env，替换全部占位值；MALL_JWT_SECRET 至少 32 字节且所有服务一致
kubectl -n selfmall-dev create secret generic mall-common-secrets --from-env-file=deploy/k8s/secrets/common.env
kubectl -n selfmall-dev create secret generic mall-product-secrets --from-env-file=deploy/k8s/secrets/product.env
```

prod 改为对应 namespace 文件和 `selfmall-prod`，使用独立凭据。Secret 不在 Kustomize 内生成，避免把真实值写入版本库或 CI 输出。更新已有 Secret 可用密钥管理系统，或将 `kubectl create secret ... --dry-run=client -o yaml` 的输出直接传给 `kubectl apply -f -`，不要保存或粘贴输出。Secret 环境变量更新后需执行 `kubectl rollout restart deployment -n <namespace>`。

`mall-common-secrets` 只包含 JWT/Nacos 凭据，`mall-product-secrets` 仅注入商品服务。ConfigMap 变化会通过 Kustomize 内容哈希改变 Pod 模板，触发滚动更新。

## 4. 校验、部署和访问

```powershell
# 不连接集群的渲染及跨资源引用检查
kubectl kustomize deploy/k8s/overlays/dev
python -m pip install -r scripts/requirements-k8s.txt
python scripts/validate-k8s.py

# namespace/Secret 就绪后，在目标集群检查 admission 和 API 支持
kubectl apply --dry-run=server -k deploy/k8s/overlays/dev
kubectl apply -k deploy/k8s/overlays/dev
kubectl -n selfmall-dev get pods,svc
kubectl -n selfmall-dev rollout status deployment/mall-gateway --timeout=300s
kubectl -n selfmall-dev rollout status deployment/mall-product --timeout=300s
kubectl -n selfmall-dev port-forward service/mall-gateway 8080:8080
```

访问 `http://localhost:8080/api/products`。cloud 商品库没有演示数据，初始返回空列表。集群不启用演示登录，`/api/auth/token` 不会签发 token；真实认证尚未开发，健康就绪不代表登录、下单、扣库存、支付功能已实现。

## 5. 生产 overlay

生产 overlay 提供基础发布策略，仍需连接真实基础设施和补齐业务后上线：

- 将 `ingress.yml` 中 `mall.example.com`、`ingressClassName: nginx` 替换为实际域名和集群已安装的 Ingress controller class。只公开 `/api`，不会公开 Actuator。Ingress 资源本身不安装控制器；也可以接入已有的云负载均衡方案。
- 在 `selfmall-prod` namespace 创建 `mall-tls` TLS Secret（`kubectl create secret tls mall-tls --cert=... --key=...`），配置 DNS。HTTPS 重定向、访问日志和限流使用实际控制器的配置；模板不假定控制器行为。
- 默认每服务两个副本；网关、商品、订单有 CPU 70% 的 HPA，2–6 副本，缩容稳定窗口 300 秒，要求 Metrics Server。应用 CPU request 为 250m，百分比相对 request；应按压测调整。
- PDB 保证自愿驱逐时至少保留一个副本；滚动更新由 Deployment 的 `maxUnavailable: 0` 控制。同一服务的 Pod 尽力分散到不同节点，不保证单节点集群容灾。
- HPA 管理的三个 Deployment 不声明 `spec.replicas`，避免重复 apply 覆盖扩缩容结果；首次创建时会从默认一个副本开始，HPA 协调到至少两个副本，发布验收需检查 HPA 和实际副本数。其他四个 Deployment 固定两个副本。
- namespace 默认资源请求约 CPU 3.5 核、内存 5.25 GiB，另需预留滚动更新和 HPA 扩容空间，以及中间件所需资源。
- prod 已配置默认拒绝入站的 NetworkPolicy；仅开放 Ingress→网关、网关→服务、订单→商品和 Sentinel→客户端。需按实际控制器及中间件 namespace/Pod 标签修改。出站网络仍需结合真实中间件地址单独制定。

```powershell
kubectl apply --dry-run=server -k deploy/k8s/overlays/prod
kubectl apply -k deploy/k8s/overlays/prod
kubectl -n selfmall-prod get deployments,hpa,pdb,ingress
```

## 探针、排障和回滚

启动探针最多等待 300 秒；存活探针只检查应用自身，不依赖数据库/Redis/Nacos，避免外部故障造成集体重启。就绪探针控制 Service 路由，商品额外检查数据库。当前 Redis 尚未用于业务，因此未加入就绪条件。设计参照 [Kubernetes 探针说明](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) 和 [Spring Boot 3.5 Actuator](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html)。

终止流程：preStop 等待 10 秒，再 SIGTERM 触发 30 秒优雅关闭，Pod 总终止宽限期 45 秒。需结合长请求、消息消费者和数据库事务进一步调整。

```powershell
kubectl -n selfmall-dev describe pod <pod-name>
kubectl -n selfmall-dev logs deployment/mall-product --tail=200
kubectl -n selfmall-dev get events --sort-by=.lastTimestamp
kubectl -n selfmall-dev rollout history deployment/mall-product
kubectl -n selfmall-dev rollout undo deployment/mall-product
```

常见失败：ImagePullBackOff 检查仓库/tag/认证；CreateContainerConfigError 检查 Secret；启动失败检查 Nacos Data ID、namespace、数据库迁移及可达性；HPA unknown 检查 Metrics Server。不要把 Actuator 健康端点作为完整交易链路测试。

生产上线还须执行 [发布前检查和验收](RELEASE.md)。当前未实际构建 Linux 镜像，也未进行集群 admission 校验或 Pod 联调。实际 API 版本兼容性需以目标集群的 server dry-run 为准。
