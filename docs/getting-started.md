# 快速开始



前提：JDK 21，首次构建可以访问 Maven Central。无需预装 Maven，Wrapper 固定 Maven 3.9.11。

```powershell
.\mvnw.cmd clean verify
```

Linux/macOS 使用 `bash mvnw clean verify`。IDE 导入根目录 `pom.xml`，项目 SDK 选 21。

在多个终端分别运行：

```powershell
.\scripts\run-service.ps1 gateway
.\scripts\run-service.ps1 auth
.\scripts\run-service.ps1 product
.\scripts\run-service.ps1 order
.\scripts\run-service.ps1 member
# 按需启动骨架服务
.\scripts\run-service.ps1 inventory
.\scripts\run-service.ps1 payment
```

也可直接执行，例如：

```sh
java -jar mall-product/target/mall-product-0.1.0-SNAPSHOT.jar --spring.profiles.active=local
```

默认 profile 为 `local`：关闭 Nacos、Sentinel 和 Redis 自动配置，商品使用内存 H2，自动迁移并插入一条示例商品。重启商品服务会丢失本地数据。cloud 不加载示例数据脚本。

### 调用示例（PowerShell）

```powershell
Invoke-RestMethod http://localhost:8080/api/products/1
$login = Invoke-RestMethod http://localhost:8080/api/auth/token -Method Post `
  -ContentType 'application/json' -Body '{"username":"demo","password":"demo123456"}'
$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
Invoke-RestMethod http://localhost:8080/api/orders/quote -Method Post -Headers $headers `
  -ContentType 'application/json' -Body '{"productId":1,"quantity":2}'
Invoke-RestMethod http://localhost:8080/api/members/me -Headers $headers
```

试算返回会员 `10001`、单价 `99.00`、金额 `198.00`。这不是创建订单，不扣库存、不发起支付，不包含优惠、运费及税费计算。

演示账号 `demo / demo123456` 只存在于 `local & !cloud`。可通过 `MALL_DEMO_PASSWORD` 更改密码。JWT 有效期 1 小时；本地默认密钥仅用于开发。cloud 必须提供 `MALL_JWT_SECRET`（至少 32 字节，所有服务一致），且不允许使用 local 默认密钥部署。生产建议用独立身份服务和非对称签名/JWKS，减少共享签名密钥的范围。

