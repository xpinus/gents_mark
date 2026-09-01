$ErrorActionPreference = 'Stop'

$srcImage = Join-Path (Join-Path $PSScriptRoot '..') 'assets' 'icon-source.png'
$outDir = Join-Path (Join-Path $PSScriptRoot '..') 'icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

if (-not (Test-Path $srcImage)) {
  Write-Warning "Source image not found at $srcImage. Skipping icon generation."
  exit 0
}

Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
foreach ($size in $sizes) {
  $src = [System.Drawing.Image]::FromFile($srcImage)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($src, 0, 0, $size, $size)
  $g.Dispose()
  $src.Dispose()
  $out = Join-Path $outDir ("icon{0}.png" -f $size)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Write-Host "Generated icons in $outDir"
