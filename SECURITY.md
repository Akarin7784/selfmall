# 安全维护

真实凭据只通过 Secret 管理系统注入。请勿在公开 Issue 中提交密钥、用户数据或漏洞利用细节。优先使用 GitHub 的 [私密漏洞报告入口](https://github.com/Akarin7784/selfmall/security/advisories/new)；如入口不可用，请先联系维护者建立私密沟通渠道，不要转为公开披露敏感信息。

main 的发布制品须通过漏洞扫描。Spring Boot、Spring Cloud、Spring Cloud Alibaba 的版本必须按兼容矩阵一起评估，Dependabot PR 不能不经验证直接合入。

当前 JWT 使用共享 HS256 密钥，生产接入真正身份服务时应评估非对称签名、令牌撤销和刷新、RBAC、管理接口授权及审计。框架当前没有这些完整能力，不应公开真实交易业务。

密钥泄漏时先撤销/轮换凭据和活动令牌，重新部署受影响服务，再清理日志及仓库历史中的泄漏内容；只删除工作区文件不能清除历史中的密钥。
