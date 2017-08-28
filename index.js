const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const { Observable } = require('rxjs')
const json = require('node-json')
const program = require('commander')

program
  .version(require('./package.json').version)
  .option('-p, --point-set <path>', 'Path to source point set, `./data/point-set.geo.json`')
  .option('-i, --input <path>', 'Path to raw responses from hawkers point set, `./data/raw`')
  .option('-o, --output <path>', 'Output path, `./output/accessibility.geo.json`')
  .option('-m, --minutes <list>', 'List of minutes, `15,30,45,60`', (list) => list.split(',').map((d) => +d))
  .parse(process.argv)

const POINT_SET = program.pointSet || './data/point-set.geo.json'
const INPUT = program.input || './data/raw'
const OUTPUT = program.output || './output/accessibility.geo.json'
const MINUTES = program.minutes || [15, 30, 45, 60]

// utils
const pointSet = json.read(path.resolve(__dirname, POINT_SET))

const getCount = ({ times }) => (minutes) =>
  times
    .map((time) => time / 60)
    .filter((time) => time <= minutes )
    .length

const features = pointSet.features.map(
  (feature) => {
    const { index } = feature.properties
    const file = `${path.resolve(__dirname, INPUT)}/${index}.json`
    const results = fs.existsSync(file)
      ? json.read(file)
      : {times: []}

    const _getCount = getCount(results)
    const value = MINUTES
      .map(_getCount)
      .reduce((memo, d) => memo + d, 0)
    const accessibility = value / (results.times.length || 1)

    feature.properties = Object.assign(feature.properties, { value, accessibility })
    return feature
  }
)

json.write(path.resolve(__dirname, OUTPUT), turf.featureCollection(features))
