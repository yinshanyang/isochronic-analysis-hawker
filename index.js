const fs = require('fs')
const path = require('path')
const { featureCollection } = require('@turf/helpers')
const booleanWithin = require('@turf/boolean-within').default
const { Observable } = require('rxjs')
const json = require('node-json')
const program = require('commander')

program
  .version(require('./package.json').version)
  .option('-p, --point-set <path>', 'Path to source point set, `./data/point-set.geo.json`')
  .option('-c, --contours <path>', 'Path to contours of point set, `./data/contours`')
  .option('-i, --hawkers <path>', 'Path to feature collection of hawkers, `./data/hawkers.geo.json`')
  .option('-o, --output <path>', 'Output path, `./output/accessibility.geo.json`')
  .option('-m, --minutes <list>', 'List of minutes, `15,30,45,60`', (list) => list.split(',').map((d) => +d))
  .parse(process.argv)

const POINT_SET = program.pointSet || './data/point-set.geo.json'
const CONTOURS = program.contours || './data/contours'
const HAWKERS = program.hawkers || './data/hawkers.geo.json'
const OUTPUT = program.output || './output/accessibility.json'
const MINUTES = program.minutes || [15, 30, 45, 60]

// utils
const pointSet = json.parse(path.resolve(__dirname, POINT_SET))
const hawkers = json.parse(path.resolve(__dirname, HAWKERS))

const getCount = (contours) => (minutes) => {
  const contour = contours.features.find(({ properties }) => properties.time / 60 === minutes)
  return contour
    ? hawkers.features.filter((hawker) => booleanWithin(hawker, contour)).length
    : 0
}

const features = pointSet.features.map(
  (feature) => {
    const { index } = feature.properties
    const file = `${path.resolve(__dirname, CONTOURS)}/${index}.geo.json`
    const results = fs.existsSync(file)
      ? json.parse(file)
      : featureCollection([])

    const _getCount = getCount(results)
    const value = MINUTES
      .map(_getCount)
      .reduce((memo, d) => memo + d, 0)
    const accessibility = value / (hawkers.features.length || 1)

    feature.properties = { ...feature.properties, value, accessibility }
    return feature
  }
)

json.format(path.resolve(__dirname, OUTPUT), featureCollection(features))
