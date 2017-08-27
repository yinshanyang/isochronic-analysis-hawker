const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const { Observable } = require('rxjs')
const json = require('node-json')
const program = require('commander')

program
  .version(require('./package.json').version)
  .option('-p, --point-set <path>', 'Path to source point set, `./data/point-set.geo.json`')
  .option('-H, --hawkers <path>', 'Path to hawker centre GeoJSON file, `./data/hawkers.geo.json`')
  .option('-i, --input <path>', 'Path to computed contours, `./data/contours`')
  .option('-o, --output <path>', 'Output path, `./output/accessibility.geo.json`')
  .option('-m, --minutes <value>', 'Threshold in minutes, `45`')
  .parse(process.argv)

const POINT_SET = program.pointSet || './data/point-set.geo.json'
const HAWKERS = program.hawkers || './data/hawkers.geo.json'
const INPUT = program.input || './data/contours'
const OUTPUT = program.output || './output/accessibility.geo.json'
const MINUTES = program.minutes || 45

// utils
const pointSet = json.read(path.resolve(__dirname, POINT_SET))
const hawkers = json.read(path.resolve(__dirname, HAWKERS))

const getCount = ({ features }) => {
  const feature = features.find((feature) => feature.properties.time === MINUTES * 60)
  return hawkers.features
    .filter((hawker) => turf.inside(hawker, feature)).length
}

const features = pointSet.features.map(
  (feature, index) => {
    const file = `${path.resolve(__dirname, INPUT)}/${index}.geo.json`
    const contours = fs.existsSync(file)
      ? json.read(file)
      : turf.featureCollection([])

    let contour = contours.features.find((feature) => feature.properties.time === MINUTES * 60)
    contour = contour && contour.geometry.coordinates.length > 0
      ? contour
      : null
    const count = contour
      ? hawkers.features.filter((hawker) => turf.inside(hawker, contour)).length
      : null
    const accessibility = count !== null
      ? count / hawkers.features.length
      : null

    feature.properties = Object.assign(feature.properties, { count, accessibility })

    if (index % 100 === 0) console.log(index)
    return feature
  }
)

json.write(path.resolve(__dirname, OUTPUT), turf.featureCollection(features))
