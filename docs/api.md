# 接口参考

本页仅列出当前已实现的接口。默认通过网关 `http://localhost:8080` 访问；商品也可直接访问 9001，订单 9003，会员 9004。各服务独立验证 JWT。

## 接口列表

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/token` | 无 | 仅 local 演示登录 |
| GET | `/api/products?page=0&size=20` | 无 | 商品列表 |
| GET | `/api/products/{id}` | 无 | 商品详情 |
| POST | `/api/orders/quote` | Bearer JWT | 价格试算，不创建订单 |
| GET | `/api/members/me` | Bearer JWT | JWT 中的会员 ID |
| GET | `/actuator/health` | 无 | 当前服务健康状态 |
| GET | `/actuator/health/liveness` | 无 | 当前服务存活探针 |
| GET | `/actuator/health/readiness` | 无 | 当前服务就绪探针 |

Actuator 不通过 API 网关转发到业务服务，需访问相应服务端口；生产 Ingress 仅公开 `/api`。

## 本地登录

```http
POST /api/auth/token
Content-Type: application/json

{"username":"demo","password":"demo123456"}
```

成功响应：

```json
{"code":"OK","message":"success","data":{"accessToken":"<JWT>","tokenType":"Bearer","expiresIn":3600}}
```

`MALL_DEMO_PASSWORD` 可以改变演示密码。cloud 模式不提供演示登录，不能用该接口建立真实账号体系。

## 商品

`page` 范围为 0–10000，`size` 为 1–100；无效分页返回 400。列表只包含启用的商品，响应中的 `data` 是数组，不包含总数。详情示例：

```json
{"code":"OK","message":"success","data":{"id":1,"skuCode":"SELF-001","name":"自营示例商品","price":99.00}}
```

不存在或未启用的商品返回 404。示例商品只由 local 迁移脚本插入。

## 订单试算

```http
POST /api/orders/quote
Authorization: Bearer <JWT>
Content-Type: application/json

{"productId":1,"quantity":2}
```

```json
{"code":"OK","message":"success","data":{"memberId":"10001","productId":1,"quantity":2,"unitPrice":99.00,"totalAmount":198.00}}
```

数量范围 1–99，商品 ID 必须大于零。会员身份来自已验证的 JWT，单价通过商品服务查询，不接受客户端报价。未计优惠、运费、税费；不预占库存、不创建订单、不调用支付。

## 跨域（CORS）

网关在 Spring Security 过滤链上统一处理跨域，预检 `OPTIONS` 请求在鉴权之前返回，不需要令牌；实际请求仍按原有规则鉴权，受保护路径无令牌返回 401。不在白名单内的来源，响应不带 `Access-Control-Allow-Origin`（预检返回 403）。

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `mall.gateway.cors.allowed-origins` | `http://localhost:5173`、`http://127.0.0.1:5173` | 允许来源，必须是完整来源；出现 `*`（含 `https://*.example.com`）时网关启动失败 |
| `mall.gateway.cors.allowed-methods` | `GET,POST,PUT,PATCH,DELETE,OPTIONS` | 允许方法，不接受 `*` |
| `mall.gateway.cors.allowed-headers` | `Authorization,Content-Type,Idempotency-Key` | 允许请求头，不接受 `*` |
| `mall.gateway.cors.exposed-headers` | `Retry-After` | 浏览器可读取的响应头 |
| `mall.gateway.cors.max-age` | `30m` | 预检缓存时间 |
| `mall.gateway.cors.allow-credentials` | `false` | 令牌走 `Authorization` 头，不依赖 Cookie，默认关闭 |

启动校验（不满足时网关启动失败，错误信息指明具体配置项）：

- `allowed-origins` 不能为空，也不能有空字符串或空白项；
- `allowed-origins`、`allowed-methods`、`allowed-headers`、`exposed-headers` 都不能含 `*`；
- `allow-credentials=true` 时，上述四项含 `*` 会单独报错，提示凭据与通配冲突。

生产来源通过 Nacos（Group `SELF_MALL`，Data ID `mall-gateway.yml`）覆盖，示例见 `deploy/nacos/mall-gateway.yml`；也可用环境变量，例如 `MALL_GATEWAY_CORS_ALLOWED_ORIGINS=https://shop.example.com,https://admin.example.com`。本地开发也可以继续用 Vite 代理把 `/api` 转到 8080，同源访问不受 CORS 影响。

## 错误

| 状态 | 常见原因 |
| --- | --- |
| 400 | 参数类型、分页、商品 ID 或数量不合法 |
| 401 | 未携带令牌、令牌无效，或演示登录密码错误 |
| 404 | 业务查询中的商品不存在 |
| 503 | 订单试算调用商品服务失败 |

业务错误格式通常为 `{"code":"INVALID_ARGUMENT","message":"请求参数不合法","data":null}`。Spring Security、网关及未匹配路径的错误可能使用框架格式；不要假定所有错误都有相同 JSON 结构。未实现接口不能按本页业务 404 契约处理。
