// url=https://figma.com/design/abc?node=1:1
import { formatLabel } from './shared-helpers'
const figma = require('figma')
const text: string = figma.currentLayer.__properties__.string('Text')
export default figma.code`def python_code():
  return ${formatLabel(text)}`
