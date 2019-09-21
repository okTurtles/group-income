const fs = require('fs')
const path = require('path')
const Svgo = require('svgo')

const svgsOriginalDir = './frontend/assets/svgs/original'
const svgsCompressedDir = './frontend/assets/svgs/compressed'

// Create '/compressed' if it doesn't exist
if (!fs.existsSync(svgsCompressedDir)) {
  fs.mkdirSync(svgsCompressedDir)
}

const svgo = new Svgo({
  plugins: [
    { cleanupIDs: true },
    { removeTitle: true },
    { removeDesc: true },
    { removeUselessStrokeAndFill: true },
    { removeViewBox: false },
    { removeDimensions: true },
    { cleanupNumericValues: { floatPrecision: 2 } },
    { convertPathData: { floatPrecision: 2 } },
    { convertTransform: { floatPrecision: 2 } },
    { cleanupListOfValues: { floatPrecision: 2 } }
  ]
})

function pretifyFileSize (filePath) {
  const size = fs.statSync(filePath).size
  return `${(size / 1000).toFixed(1)}kb`
}

// Find all SVG files to run Svgo
const svgFiles = fs.readdirSync(svgsOriginalDir)

svgFiles.forEach((svgFile) => {
  const svgName = path.basename(svgFile, '.svg')
  const svgOriginalPath = path.resolve(svgsOriginalDir, svgFile)
  const svgCompressedPath = path.resolve(svgsCompressedDir, `${svgName}.svg`)
  const svgContent = fs.readFileSync(svgOriginalPath)

  svgo.optimize(svgContent).then((result) => {
    // Create each SVG file already compressed
    try {
      fs.writeFileSync(svgCompressedPath, result.data)
      const sizeOriginal = pretifyFileSize(svgOriginalPath)
      const sizeCompressed = pretifyFileSize(svgCompressedPath)

      console.log(`✓ SVG ${svgName}.svg compressed! (${sizeOriginal} -> ${sizeCompressed})`)
    } catch (err) {
      console.error(err)
    }
  })
})
