# Script para iniciar um servidor local rápido para o site AURAL Hardware Lab
param([int]$Port = 3000)

$Root = $PSScriptRoot
$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://localhost:$Port/")

try {
    $Listener.Start()
    Write-Host "==========================================================" -ForegroundColor DarkGray
    Write-Host "⚡ AURAL HARDWARE LAB — SERVIDOR ATIVO (BLUE & OBSIDIAN EDITION)" -ForegroundColor Blue
    Write-Host "Acesse o site no seu navegador: http://localhost:$Port/" -ForegroundColor Cyan
    Write-Host "Pressione Ctrl+C para encerrar o servidor." -ForegroundColor DarkGray
    Write-Host "==========================================================" -ForegroundColor DarkGray

    Start-Process "http://localhost:$Port/"

    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $LocalPath = $Request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($LocalPath)) {
            $LocalPath = "index.html"
        }

        $FilePath = Join-Path $Root $LocalPath

        if (Test-Path $FilePath -PathType Leaf) {
            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()

            $ContentType = switch ($Ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".glb"  { "model/gltf-binary" }
                default { "application/octet-stream" }
            }

            $Response.ContentType = $ContentType
            $Response.ContentLength64 = $Bytes.Length
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
            $ErrorMsg = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found")
            $Response.OutputStream.Write($ErrorMsg, 0, $ErrorMsg.Length)
        }

        $Response.Close()
    }
} finally {
    $Listener.Stop()
}
