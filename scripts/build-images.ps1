param(
    [string]$Registry = 'selfmall',
    [string]$Tag = '0.1.0',
    [switch]$Push
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$services = 'gateway','auth','product','inventory','order','member','payment'
Push-Location $projectRoot
try {
    foreach ($service in $services) {
        $module = "mall-$service"
        if (!(Test-Path "$module/target/$module-0.1.0-SNAPSHOT.jar")) {
            throw "缺少 $module 的 JAR，请先执行 .\mvnw.cmd clean verify"
        }
    }
    foreach ($service in $services) {
        $module = "mall-$service"
        $image = "$($Registry.TrimEnd('/'))/${module}:$Tag"
        & docker build --file deploy/Dockerfile --build-arg "SERVICE=$module" --tag $image .
        if ($LASTEXITCODE -ne 0) { throw "镜像构建失败：$image" }
        if ($Push) {
            & docker push $image
            if ($LASTEXITCODE -ne 0) { throw "镜像推送失败：$image" }
        }
    }
} finally {
    Pop-Location
}
