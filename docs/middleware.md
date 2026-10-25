# 中间件开发环境



先启动 Docker 引擎：

```powershell
Copy-Item deploy/.env.example deploy/.env
# 按需修改 deploy/.env 中的本地密码
docker compose --env-file deploy/.env -f deploy/compose.yml up -d
```

提供 MySQL 8.4.5、Redis 7.4.3、Nacos 3.0.3。端口只绑定 `127.0.0.1`。Nacos 控制台为 [localhost:8088](http://localhost:8088)，客户端使用 8848/9848。本地 Compose 关闭 Nacos API 鉴权；仅用于本机开发，不作为生产部署模板。控制台如要求初始化管理员，请按界面完成。

将 `deploy/nacos/*.yml` 分别导入 Nacos：Data ID 与文件名一致、Group 为 `SELF_MALL`、namespace 默认 public。cloud 使用必需的 `spring.config.import=nacos:...`，缺少配置/连接失败时启动失败；不要使用旧 `bootstrap.yml`。详见 [官方 Nacos 接入说明](https://sca.aliyun.com/docs/2025.x/user-guide/nacos/advanced-guide/)。当前版本的远程配置热更新存在上游问题，本框架不依赖热更新；修改配置后重启验证。

在启动 cloud 服务的终端设置环境变量（每个终端均需设置）：

```powershell
$env:MALL_JWT_SECRET = 'replace-with-your-own-random-secret-at-least-32-bytes'
$env:NACOS_SERVER_ADDR = 'localhost:8848'
# 本地 Compose 未开启 API 鉴权；占位凭据不用于实际鉴权
$env:NACOS_USERNAME = 'nacos'
$env:NACOS_PASSWORD = 'local-unused'
$env:MYSQL_USERNAME = 'mall_product'
$env:MYSQL_PASSWORD = 'localProductChangeMe2026' # 与 deploy/.env 一致
$env:REDIS_PASSWORD = 'localRedisChangeMe2026'   # 与 deploy/.env 一致
.\scripts\run-service.ps1 product -Profile cloud
```

其他服务同理。`deploy/.env` 供 Compose 读取，不会自动导入 Java 进程的环境变量。服务运行在宿主机，Nacos/数据库运行在 Docker；如果把 Java 服务也容器化，需要将 localhost 改成对应容器服务名。

cloud 商品库初始为空。业务服务骨架尚未配置各自的数据源；后续按服务独立建库、独立账号，禁止跨服务直接查表。商品服务 Redis 客户端已接入，业务缓存策略尚未实现。数据库迁移当前由启动时 Flyway 执行；生产应由独立迁移任务执行并收紧运行账号权限。

cloud 的认证服务当前只提供健康检查，接入真实身份系统后才可登录。不能将 local 演示登录用于线上账号认证。

### Sentinel、RocketMQ 与 Seata

- Servlet 业务服务接入 Sentinel starter，cloud 可通过 `SENTINEL_DASHBOARD` 设置控制台（默认 localhost:8858）。控制台需另行启动；尚未提供限流规则持久化、业务资源规则或网关 Sentinel 适配。
- RocketMQ 5.3.1 和 Seata 2.5.0 的依赖通过 Maven profile `alibaba-extended` 引入订单、库存服务，避免基础开发环境强依赖全部中间件。
- 构建扩展：`.\mvnw.cmd -Palibaba-extended clean verify`；启动可选容器：`docker compose --env-file deploy/.env -f deploy/compose.yml --profile extended up -d`。
- 当前 `seata.enabled=false`，没有开启全局事务；RocketMQ 尚未配置 binding，也没有消息生产/消费实现。不能把“依赖可构建”理解为交易一致性已经完成。
- 集成 Seata 前，为参与事务的服务配置 JDBC 数据源、事务组、服务映射及 `undo_log`；先验证本地事务，再设计跨服务回滚边界。
- 集成 RocketMQ 前，创建业务 Topic、配置 binding/group，并实现消息幂等、重试、死信告警及补偿任务；本地 broker 禁止自动建 Topic，公告地址为 127.0.0.1。
- 可选容器是本地开发模板，未包含高可用、生产账号体系及存储容量规划。

