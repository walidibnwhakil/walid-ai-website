Add-Type -AssemblyName System.Drawing
$source = Join-Path $PSScriptRoot 'originals'
$selected = Join-Path $PSScriptRoot 'selected-crops'
$output = Join-Path $PSScriptRoot '../images/approved'
New-Item -ItemType Directory -Path $output -Force | Out-Null

function Write-Layer($InputFile, $Name, $X, $Y, $Width, $Height, $Outline = @(), $OutputWidth = $Width, $OutputHeight = $Height) {
    $inputImage = [Drawing.Bitmap]::new($InputFile)
    $layer = [Drawing.Bitmap]::new($OutputWidth, $OutputHeight)
    $graphics = [Drawing.Graphics]::FromImage($layer)
    $graphics.InterpolationMode = 'HighQualityBicubic'
    $graphics.SmoothingMode = 'AntiAlias'
    if ($Name -eq 'window.jpg') { $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#271911')) }
    if ($Outline.Count) {
        $points = for ($i = 0; $i -lt $Outline.Count; $i += 2) {
            [Drawing.PointF]::new(($Outline[$i] - $X) * $OutputWidth / $Width, ($Outline[$i+1] - $Y) * $OutputHeight / $Height)
        }
        $brush = [Drawing.TextureBrush]::new($inputImage)
        $brush.TranslateTransform(-$X, -$Y)
        $graphics.FillPolygon($brush, [Drawing.PointF[]]$points)
        $brush.Dispose()
    } else {
        $graphics.DrawImage($inputImage, [Drawing.Rectangle]::new(0, 0, $OutputWidth, $OutputHeight),
            [Drawing.Rectangle]::new($X, $Y, $Width, $Height), [Drawing.GraphicsUnit]::Pixel)
    }
    if ($Name -eq 'window.jpg') {
        $matte = [Drawing.ColorTranslator]::FromHtml('#271911')
        # Feather the right-hand edge into the title panel without dimming the window.
        for ($i = 1; $i -lt $points.Count - 2; $i++) {
            $from = $points[$i]
            $to = $points[$i + 1]
            for ($row = [int]$from.Y; $row -lt $to.Y; $row++) {
                $edge = [int]($from.X + ($to.X - $from.X) * ($row - $from.Y) / ($to.Y - $from.Y))
                $width = if ($row -lt 530) { 56 } else { 38 }
                for ($column = $edge - $width; $column -lt $edge; $column++) {
                    $weight = ($edge - $column) / $width
                    $pixel = $layer.GetPixel($column, $row)
                    $layer.SetPixel($column, $row, [Drawing.Color]::FromArgb(
                        [int]($matte.R + ($pixel.R - $matte.R) * $weight),
                        [int]($matte.G + ($pixel.G - $matte.G) * $weight),
                        [int]($matte.B + ($pixel.B - $matte.B) * $weight)
                    ))
                }
            }
        }
    }
    $format = if ($Name.EndsWith('.jpg')) { [Drawing.Imaging.ImageFormat]::Jpeg } else { [Drawing.Imaging.ImageFormat]::Png }
    $layer.Save((Join-Path $output $Name), $format)
    $graphics.Dispose()
    $layer.Dispose()
    $inputImage.Dispose()
}

$board = Join-Path $source 'a_highly_detailed_cinematic_warm_lit_illustrated.png'
$printerScene = Join-Path $source 'detective_s_printer_reveals_the_answer.png'
Write-Layer (Join-Path $source 'a_richly_detailed_cinematic_illustrated_game_titl.png') 'window.jpg' 182 0 793 982 @(
    182,0, 746,0, 746,246, 735,278, 732,462, 735,505, 758,528, 819,545, 869,552,
    870,720, 888,749, 930,771, 947,834, 974,882, 975,982, 182,982
)
Write-Layer (Join-Path $selected 'C4_Minimal_Detective_Office.png') 'office.jpg' 5 6 334 156
Write-Layer (Join-Path $selected 'A4_Modern_Classic_Detective.png') 'detective.png' 46 0 276 218 @(
    47,218, 55,187, 71,168, 109,153, 128,142, 126,128, 109,116, 87,115, 74,108, 67,96,
    71,79, 89,59, 87,39, 91,22, 108,7, 129,0, 157,0, 176,11, 188,27, 213,22, 226,23,
    234,30, 232,40, 221,55, 218,65, 220,79, 225,94, 241,102, 269,110, 273,94, 294,91,
    296,106, 290,120, 280,125, 266,124, 242,114, 224,106, 218,121, 214,139, 240,145,
    270,158, 290,175, 311,204, 322,218
)
Write-Layer (Join-Path $selected 'B1_Fluffy_White_Cat.png') 'cat.png' 75 26 167 130 @(
    75,156, 84,138, 99,126, 103,111, 104,93, 110,76, 125,60, 121,46, 121,35, 131,36,
    151,49, 165,46, 185,45, 204,32, 215,27, 219,37, 215,65, 222,80, 227,99, 228,120,
    236,135, 242,156
)
Write-Layer $board 'cat-resting.png' 1297 632 330 134 @(
    1300,752, 1308,722, 1330,698, 1348,684, 1353,641, 1361,638, 1383,661, 1403,652,
    1423,647, 1444,636, 1474,634, 1504,639, 1534,653, 1558,675, 1574,702, 1607,719,
    1626,734, 1625,751, 1608,761, 1560,762, 1522,757, 1486,763, 1447,765, 1410,762,
    1371,766, 1331,762, 1307,762
)
Write-Layer $board 'grip.png' 1211 278 86 80 @(
    1212,302, 1218,292, 1247,283, 1261,282, 1276,290, 1291,309, 1296,328,
    1289,345, 1276,356, 1261,355, 1238,339, 1222,328, 1213,315
)
Write-Layer $board 'crumpled.png' 607 545 39 38 @(
    611,554, 619,552, 623,546, 630,552, 638,553, 643,561, 639,567, 640,573,
    629,581, 624,577, 615,576, 609,568
)
Write-Layer $board 'crumple-hands.png' 264 650 177 103 @(
    265,723, 277,702, 296,675, 313,663, 333,658, 345,665, 355,659, 371,666,
    388,654, 404,654, 415,664, 424,684, 431,700, 440,728, 433,745, 420,751,
    404,749, 391,734, 376,721, 355,723, 344,719, 325,724, 311,737, 292,751, 278,748
)
Write-Layer $printerScene 'printer.png' 358 276 150 151 @(
    359,323, 372,302, 390,289, 419,282, 476,277, 508,276, 508,427, 468,422, 412,414, 359,399
)
$portrait = Join-Path $source 'Whakil Ahamed Shakil-.jpg'
$dimensions = [Drawing.Image]::FromFile($portrait)
$portraitHeight = [Math]::Round(240 * $dimensions.Height / $dimensions.Width)
Write-Layer $portrait 'founder.jpg' 0 0 $dimensions.Width $dimensions.Height @() 240 $portraitHeight
$dimensions.Dispose()
