param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('gateway','auth','product','inventory','order','member','payment')]
    [string]$Service,
    [ValidateSet('local','cloud')][string]$Profile = 'local'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$jarPath = Join-Path $projectRoot "mall-$Service/target/mall-$Service-0.1.0-SNAPSHOT.jar"
if (!(Test-Path -LiteralPath $jarPath)) { throw '先在项目根目录执行 .\mvnw.cmd clean verify' }
Push-Location $projectRoot
try {
    & java -jar "mall-$Service/target/mall-$Service-0.1.0-SNAPSHOT.jar" "--spring.profiles.active=$Profile"
    $serviceExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $serviceExitCode
