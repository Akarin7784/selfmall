# SelfMall 文档

SelfMall 是基于 Spring Cloud Alibaba 的自营电商后端开发框架。你可以先在本机跑通商品查询和订单试算，再连接中间件、扩展业务并准备 Kubernetes 部署。

## 从这里开始

| 目标 | 阅读顺序 |
| --- | --- |
| 第一次运行 | [快速开始](getting-started.md) → [接口参考](api.md) |
| 理解设计 | [架构与模块](architecture.md) → [配置参考](configuration.md) |
| 接入中间件 | [中间件开发](middleware.md) → [故障排查](troubleshooting.md) |
| 部署与运维 | [Kubernetes](kubernetes.md) → [发布与回滚](RELEASE.md) |
| 参与开发 | [开发与测试](development.md) → [路线图](roadmap.md) |

## 当前范围

已实现商品分页/详情、本地演示登录、JWT 校验、订单价格试算和当前会员 ID 查询。库存、支付服务当前只有启动骨架。

**本项目尚不能作为完整电商系统上线。** 真实账号、权限、下单、库存扣减、支付、退款、消息一致性及运营页面尚待开发。生产配置是发布基线，不能代替业务验收。

源码和贡献入口：[Akarin7784/selfmall](https://github.com/Akarin7784/selfmall)。项目使用 MIT 许可证。
