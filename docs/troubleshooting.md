# 常见问题

## Maven 不存在

使用仓库内的 Maven Wrapper：Windows `./mvnw.cmd`，Linux/macOS `bash mvnw`。首次执行需要网络，JDK 必须为 21。不要提交下载缓存。

## Windows 中文路径无法启动 JAR

在项目根目录使用相对路径运行 JAR，或使用 `scripts/run-service.ps1`。部分 Java/终端编码组合不能正确传递中文绝对路径。

## cloud 无法启动

核对 Nacos 地址、namespace ID、Group `SELF_MALL`、Data ID、账号和 gRPC 端口。cloud 的 Nacos 导入不是 optional，配置缺失或连接失败应当阻止启动。商品服务还需核对 MySQL 数据库/权限和 Redis 配置。

## 登录或试算返回 401

演示登录仅用于 local。检查 `Authorization: Bearer <token>`、过期时间，以及所有服务的 JWT 密钥是否一致。不要将 token 发到公开 Issue。

## 试算返回 503

检查商品服务及服务调用路径：local 使用 localhost:9001，cloud 通过 Nacos，K8S 通过 mall-product:8080。该接口不会在上游故障时编造价格。

## Docker / Kubernetes 不可用

检查 Docker 引擎是否启动、`kubectl config current-context` 是否配置。清单通过本地校验不表示已部署。ImagePullBackOff 检查镜像路径、digest 和拉取 Secret；CreateContainerConfigError 检查 Secret/ConfigMap。

## 文档站构建失败

执行 `python -m mkdocs build --strict` 查看缺失文件或链接。页面相对链接以当前 Markdown 所在目录为基准；仓库源码链接使用完整 GitHub 地址。GitHub Pages 必须设置为 GitHub Actions 构建来源。

## 报告问题

提供分支/提交、运行模式、Java/系统版本、脱敏日志和最小复现步骤。通过 [Issues](https://github.com/Akarin7784/selfmall/issues) 提交普通问题；安全问题请参见 [安全政策](https://github.com/Akarin7784/selfmall/security/policy)。
