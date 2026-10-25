# SelfMall

**基于 Spring Cloud Alibaba 的自营电商后端开发框架。**

[![Build](https://github.com/Akarin7784/selfmall/actions/workflows/ci.yml/badge.svg)](https://github.com/Akarin7784/selfmall/actions/workflows/ci.yml)
[![Docs](https://github.com/Akarin7784/selfmall/actions/workflows/docs.yml/badge.svg)](https://github.com/Akarin7784/selfmall/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[文档站](https://akarin7784.github.io/selfmall/) · [快速开始](docs/getting-started.md) · [架构](docs/architecture.md) · [问题反馈](https://github.com/Akarin7784/selfmall/issues) · [贡献指南](CONTRIBUTING.md)

SelfMall 提供服务拆分、本地开发环境、JWT 鉴权示例、商品查询、订单试算，以及 Kubernetes 发布基线，适合在此基础上继续实现自营电商业务。

> **项目状态：开发框架。** 尚未实现真实账号体系、下单、库存扣减、支付或商城前端；生产发布检查默认不通过。请勿将演示接口作为完整交易系统上线。

## 能力

- 七个可独立启动的服务：网关、认证、商品、库存、订单、会员、支付。
- Spring Cloud Alibaba Nacos 配置/发现、Sentinel 接入，以及 RocketMQ/Seata 可选扩展依赖。
- 商品数据库迁移、分页/详情查询，JWT 鉴权和 OpenFeign 订单试算示例。
- `local` 模式无需 Docker，`cloud` 模式连接中间件，`cloud,k8s` 使用 Kubernetes Service。
- Maven Wrapper、CI、端到端冒烟脚本、镜像扫描/SBOM 发布流程和 Kustomize dev/prod 配置。

## 技术栈

| 组件 | 版本/用途 |
| --- | --- |
| Java | 21 |
| Spring Boot / Spring Cloud | 3.5.0 / 2025.0.0 |
| Spring Cloud Alibaba | 2025.0.0.0 |
| Nacos / Sentinel | 3.0.3 / 1.8.9 |
| MySQL / Redis | 8.4.5 / 7.4.3（开发容器） |
| 数据访问 | Spring JDBC、Flyway；local 使用 H2 |
| 部署 | Docker、Kubernetes、Kustomize |

这是锁定的开发基线，不代表组件的最新版本；生产使用前需按兼容矩阵升级和扫描。RocketMQ/Seata 的业务集成尚未完成。

## 快速开始

准备 JDK 21 和可访问 Maven Central 的网络，无需预装 Maven。

```sh
git clone https://github.com/Akarin7784/selfmall.git
cd selfmall
bash mvnw clean verify
```

Windows PowerShell 将最后一行替换为 `./mvnw.cmd clean verify`。

先启动商品服务：

```sh
java -jar mall-product/target/mall-product-0.1.0-SNAPSHOT.jar --spring.profiles.active=local
```

另开终端访问示例商品：

```sh
curl http://localhost:9001/api/products/1
```

返回示例商品和价格 `99.00`。本地 H2 数据随进程退出丢失。完整网关、登录和订单试算操作见 [快速开始](docs/getting-started.md)。

## 项目结构

```text
mall-gateway/          网关
mall-auth/             本地演示认证
mall-product/          商品查询和持久化
mall-order/            订单试算
mall-inventory/        库存服务骨架
mall-member/           当前会员身份查询
mall-payment/          支付服务骨架
mall-common-*/         公共响应、安全和 Web 配置
deploy/                Docker、K8S、中间件和监控配置
scripts/               构建、启动、验证和迁移脚本
docs/                  文档站 Markdown 源码
frontend/              前端 pnpm workspace（见 frontend/README.md）
```

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [快速开始](docs/getting-started.md) | 本地启动、演示登录、调用链 |
| [架构](docs/architecture.md) | 服务边界、端口、运行模式 |
| [接口参考](docs/api.md) | 已实现接口、请求/响应与错误 |
| [配置参考](docs/configuration.md) | 环境变量、配置优先级、Secret |
| [中间件](docs/middleware.md) | Nacos、MySQL、Redis 与扩展组件 |
| [Kubernetes](docs/kubernetes.md) | 镜像、配置、探针、部署 |
| [发布与回滚](docs/RELEASE.md) | 制品扫描、数据库迁移、验收与恢复 |
| [开发与测试](docs/development.md) | 分支、测试和文档维护 |
| [常见问题](docs/troubleshooting.md) | 构建、鉴权与部署排障 |

## 验证

```sh
bash mvnw clean verify
python scripts/smoke-test.py
python -m pip install -r scripts/requirements-k8s.txt
python scripts/validate-k8s.py
python -m unittest discover -s scripts -p 'test_*.py'
```

冒烟检查需 Python 3，会启动七个服务并占用 8080、9000–9005 端口，结束后自动回收。K8S 检查需 `kubectl`，不要求已连接集群。

## 参与贡献

开发基于 `develop`，稳定发布基线保存在 `main`。提交 Issue 或 PR 前请阅读 [贡献指南](CONTRIBUTING.md)、[行为准则](CODE_OF_CONDUCT.md) 和 [安全说明](SECURITY.md)。未完成能力见 [路线图](docs/roadmap.md)，变更记录见 [CHANGELOG](CHANGELOG.md)。

## 许可证

本项目采用 [MIT License](LICENSE)。第三方组件遵循各自许可证；构建制品和依赖分发时需保留相应声明。
