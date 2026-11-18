Add-Type -AssemblyName System.Drawing
$projectDirectory = Split-Path $PSScriptRoot -Parent
$iconDirectory = Join-Path $projectDirectory 'icons'
[IO.Directory]::CreateDirectory($iconDirectory) | Out-Null
$canvas = [Drawing.Bitmap]::new(1024, 1024)
$graphics = [Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([Drawing.ColorTranslator]::FromHtml('#285537'))
$ink = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#FFFFFF'))
$accent = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#C5DFC1'))
$font = [Drawing.Font]::new('Segoe UI', 266, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$format = [Drawing.StringFormat]::new()
$format.Alignment = [Drawing.StringAlignment]::Center
$format.LineAlignment = [Drawing.StringAlignment]::Center
$graphics.DrawString('OFC', $font, $ink, [Drawing.RectangleF]::new(90, 225, 844, 350), $format)
# Three / five / five marks echo the three rows of an OFC hand.
foreach ($row in 0..2) {
  $cards = if ($row -eq 0) { 3 } else { 5 }
  $width = $cards * 65 + ($cards - 1) * 18
  $left = (1024 - $width) / 2
  foreach ($card in 0..($cards - 1)) {
    $graphics.FillRectangle($accent, [single]($left + $card * 83), [single](619 + $row * 61), 65, 30)
  }
}
$graphics.Dispose()
foreach ($size in @(180, 192, 512)) {
  $output = [Drawing.Bitmap]::new($size, $size)
  $resizer = [Drawing.Graphics]::FromImage($output)
  $resizer.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $resizer.DrawImage($canvas, 0, 0, $size, $size)
  $filename = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
  $output.Save((Join-Path $iconDirectory $filename), [Drawing.Imaging.ImageFormat]::Png)
  $resizer.Dispose()
  $output.Dispose()
}
$canvas.Dispose()
$ink.Dispose()
$accent.Dispose()
$font.Dispose()
$format.Dispose()
