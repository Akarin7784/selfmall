# 配置参考

配置通过 `application.yml`、profile 文件、Nacos 和环境变量组合。默认 profile 是 `local`；生产必须显式使用 `cloud,k8s`，不能依赖默认值。

## 环境变量

| 变量 | 作用 | 默认/要求 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | 运行模式 | local / cloud / cloud,k8s |
| `SERVER_PORT` | HTTP 端口 | 本地按服务区分；K8S 统一 8080 |
| `MALL_JWT_SECRET` | JWT 签名/校验密钥 | cloud 必填，至少 32 UTF-8 字节 |
| `MALL_DEMO_PASSWORD` | local 演示密码 | demo123456 |
| `NACOS_SERVER_ADDR` | Nacos API 地址 | cloud 默认 localhost:8848 |
| `NACOS_NAMESPACE` | Nacos namespace ID | cloud 默认 public；生产显式隔离 |
| `NACOS_USERNAME` / `NACOS_PASSWORD` | Nacos 凭据 | cloud 必填 |
| `MYSQL_URL` | 商品 JDBC URL | cloud 默认本机 mall_product |
| `MYSQL_USERNAME` / `MYSQL_PASSWORD` | 商品数据库凭据 | cloud 必填 |
| `REDIS_HOST` / `REDIS_PORT` | Redis 地址 | localhost / 6379 |
| `REDIS_PASSWORD` | Redis 凭据 | cloud 必填 |
| `SENTINEL_DASHBOARD` | Sentinel 控制台 | localhost:8858 |
| `MIGRATION_MYSQL_*` | 独立迁移连接/账号 | 只注入迁移进程 |

Nacos Data ID 为 `<spring.application.name>.yml`，Group 为 `SELF_MALL`。不要将生产密钥写入 Git 或本页示例。`deploy/.env` 仅供 Docker Compose 读取，不会自动传给宿主机 Java 进程。

## Kubernetes 配置

`mall-runtime` 和 `mall-infrastructure` ConfigMap 管理运行参数与地址；`mall-application` 挂载 `application-k8s.yml` 到 `/app/config/`。环境变量通过 `envFrom` 注入。

| Secret | 用途 |
| --- | --- |
| mall-common-secrets | JWT 和 Nacos 凭据 |
| mall-product-secrets | 商品数据库和 Redis 凭据，仅商品服务使用 |
| mall-registry | prod 镜像拉取凭据 |
| mall-tls | 生产 Ingress TLS 证书 |

prod 商品服务关闭 Flyway 自动迁移，先执行独立迁移再部署。ConfigMap 内容哈希变化触发滚动更新；Secret 的环境变量更新需要重新启动相关 Pod。

## 配置变更原则

环境变量和命令行可覆盖配置文件属性，勿将调试参数遗留到生产。Nacos 改动必须与部署配置一起审查；当前框架不依赖热更新，修改后重启并验证。服务端口改变后须同步网关、客户端和探针配置。
