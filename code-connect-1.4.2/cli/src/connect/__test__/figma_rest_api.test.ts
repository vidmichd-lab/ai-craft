import { getApiUrl } from '../figma_rest_api'
import { logger } from '../../common/logging'

describe('getApiUrl', () => {
  beforeEach(() => {
    logger.debug = jest.fn()
    logger.info = jest.fn()
    jest.resetAllMocks()
  })

  it('returns default API URL for regular Figma URLs', () => {
    const result = getApiUrl('https://www.figma.com/file/abc123')
    expect(result).toBe('https://api.figma.com/v1')
  })

  it('uses custom API URL when override is provided', () => {
    const customUrl = 'https://mycompany-figma.com/v1'
    const result = getApiUrl('https://www.figma.com/file/abc123', customUrl)
    expect(result).toBe(customUrl)
  })

  it('returns default API URL when the override is undefined', () => {
    const result = getApiUrl('https://www.figma.com/file/abc123', undefined)
    expect(result).toBe('https://api.figma.com/v1')
  })

  it('returns default API URL when the override is empty', () => {
    const result = getApiUrl('https://www.figma.com/file/abc123', '')
    expect(result).toBe('https://api.figma.com/v1')
  })
})
