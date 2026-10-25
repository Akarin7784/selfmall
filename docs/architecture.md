# 架构与模块



| 模块 | 端口 | 当前能力 |
| --- | --- | --- |
| mall-gateway | 8080 | WebFlux 网关、显式路由、JWT 校验；cloud 使用 Nacos 服务发现 |
| mall-auth | 9000 | local 演示登录和 JWT 签发；cloud 不提供演示登录 |
| mall-product | 9001 | 商品分页、详情、JDBC 持久化、Flyway 迁移；local H2，cloud MySQL |
| mall-inventory | 9002 | 库存服务启动骨架，预留库存流水、预占、释放业务 |
| mall-order | 9003 | JWT 身份校验、Feign 商品查询、服务端价格试算 |
| mall-member | 9004 | 从 JWT 获取当前会员 ID；预留会员资料、收货地址 |
| mall-payment | 9005 | 支付服务启动骨架，预留支付单、回调、退款、对账业务 |
| mall-common-core | — | 统一响应、跨服务商品查询 DTO |
| mall-common-security | — | JWT 密钥及 issuer、audience、过期校验 |
| mall-common-web | — | Servlet 安全配置、参数校验、异常处理自动配置 |

网关不依赖 Servlet 公共模块。业务服务独立验证 JWT，身份不从客户端传来的用户 ID 请求头读取。金额采用 `BigDecimal` 和 `DECIMAL(12,2)`。


## 调用链

```text
客户端 → Gateway → Auth / Product / Inventory / Order / Member / Payment
                                  Order → OpenFeign → Product → H2 / MySQL
```

| 运行方式 | 注册与配置 | 服务调用 | 数据库 |
| --- | --- | --- | --- |
| local | 不连接 Nacos | 本机固定端口 | 内存 H2 |
| cloud | Nacos 注册、Nacos 配置 | 网关 lb://，Feign 服务名 | MySQL |
| cloud,k8s | Nacos 配置；关闭 Nacos 注册 | Kubernetes Service DNS | MySQL |

## 服务边界

每个业务服务独立部署，未来使用独立数据库/账号。跨服务访问通过 API 或消息完成，不直接查询其他服务的表。目前只有商品服务实现了数据持久化，其他模块不应被描述成已经具备完整业务。

公共模块仅承载响应模型、跨服务查询 DTO 和基础配置。网关使用响应式 WebFlux，不能依赖引入 Servlet 的 `mall-common-web`。

## 当前限制

JWT 为 HS256 共享密钥模式，生产身份体系尚未实现。Redis 只配置了客户端，尚无业务缓存；RocketMQ 与 Seata 仅有可选依赖和开发容器。订单接口只做价格试算，不保证库存，不创建交易记录。
