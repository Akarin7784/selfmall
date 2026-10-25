[CmdletBinding()]
param([ValidateSet('info','validate','migrate')][string]$Operation = 'info')
$ErrorActionPreference = 'Stop'
foreach ($name in 'MIGRATION_MYSQL_URL','MIGRATION_MYSQL_USERNAME','MIGRATION_MYSQL_PASSWORD') {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "缺少环境变量 $name；请由密钥管理系统注入，勿将凭据写入命令历史。"
    }
}
if (!$env:MIGRATION_MYSQL_URL.StartsWith('jdbc:mysql://')) { throw '生产迁移仅允许 MySQL JDBC URL' }
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    & .\mvnw.cmd -B -pl mall-product -Pdb-migrate "flyway:$Operation"
    if ($LASTEXITCODE -ne 0) { throw "数据库操作 $Operation 失败，禁止继续发布" }
} finally {
    Pop-Location
}
