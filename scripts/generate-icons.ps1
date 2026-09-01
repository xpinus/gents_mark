$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$outDir = Join-Path (Join-Path $PSScriptRoot '..') 'icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

foreach ($size in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $scale = $size / 128.0
  $outline = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 41, 59))
  $gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 212, 175, 55))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))

  $rect = New-Object System.Drawing.RectangleF(
    [float](8 * $scale), [float](8 * $scale),
    [float](112 * $scale), [float](112 * $scale))
  $radius = [float](18 * $scale)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($rect.X, $rect.Y, 2 * $radius, 2 * $radius, 180, 90)
  $path.AddArc($rect.Right - 2 * $radius, $rect.Y, 2 * $radius, 2 * $radius, 270, 90)
  $path.AddArc($rect.Right - 2 * $radius, $rect.Bottom - 2 * $radius, 2 * $radius, 2 * $radius, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - 2 * $radius, 2 * $radius, 2 * $radius, 90, 90)
  $path.CloseFigure()
  $g.FillPath($outline, $path)

  $brim = New-Object System.Drawing.RectangleF(
    [float](24 * $scale), [float](64 * $scale),
    [float](80 * $scale), [float](12 * $scale))
  $g.FillEllipse($gold, $brim)

  $crown = New-Object System.Drawing.RectangleF(
    [float](44 * $scale), [float](26 * $scale),
    [float](40 * $scale), [float](40 * $scale))
  $crownPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $points = New-Object 'System.Drawing.PointF[]' 4
  $points[0] = New-Object System.Drawing.PointF([float]$crown.X, [float]$crown.Bottom)
  $points[1] = New-Object System.Drawing.PointF([float]($crown.X + 6 * $scale), [float]$crown.Y)
  $points[2] = New-Object System.Drawing.PointF([float]($crown.Right - 6 * $scale), [float]$crown.Y)
  $points[3] = New-Object System.Drawing.PointF([float]$crown.Right, [float]$crown.Bottom)
  $crownPath.AddPolygon($points)
  $g.FillPath($gold, $crownPath)

  $band = New-Object System.Drawing.RectangleF(
    [float](48 * $scale), [float](54 * $scale),
    [float](32 * $scale), [float](8 * $scale))
  $g.FillRectangle($white, $band)

  $g.Dispose()
  $out = Join-Path $outDir ("icon{0}.png" -f $size)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Write-Host "Generated icons in $outDir"
