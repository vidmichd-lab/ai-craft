import { exec } from 'child_process'
import { readFileSync, rmSync, existsSync } from 'fs'
import path from 'path'
import { promisify } from 'util'
import { tidyStdOutput } from '../../../__test__/utils'
import { parseRawFile } from '../../raw_templates'

describe('e2e test for `migrate` command', () => {
  const testParentPath = path.join(__dirname, 'e2e_migrate_command')

  function getTestPath(testName: string) {
    return path.join(testParentPath, testName)
  }

  async function runMigrate(cwd: string, extraArgs = '') {
    return await promisify(exec)(
      `npx tsx ../../../../../cli connect migrate --skip-update-check --remove-props${extraArgs ? ' ' + extraArgs : ''}`,
      {
        cwd,
      },
    )
  }

  function cleanupTemplateFiles(testPath: string) {
    const files = ['Button.figma.ts', 'Button.figma.js', 'Avatar.figma.ts', 'Avatar.figma.js']
    files.forEach((file) => {
      const filePath = path.join(testPath, file)
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true })
      }
    })
  }

  it('successfully migrates React Code Connect files to parserless templates (JavaScript by default)', async () => {
    const testPath = getTestPath('react_basic')

    try {
      const result = await runMigrate(testPath)

      // .figma.js files were created (not .figma.ts)
      const buttonTemplatePath = path.join(testPath, 'Button.figma.js')
      const avatarTemplatePath = path.join(testPath, 'Avatar.figma.js')
      expect(existsSync(buttonTemplatePath)).toBe(true)
      expect(existsSync(avatarTemplatePath)).toBe(true)
      expect(existsSync(path.join(testPath, 'Button.figma.ts'))).toBe(false)
      expect(existsSync(path.join(testPath, 'Avatar.figma.ts'))).toBe(false)

      // Read generated files
      const buttonTemplate = readFileSync(buttonTemplatePath, 'utf-8')
      const avatarTemplate = readFileSync(avatarTemplatePath, 'utf-8')

      // Check key parts of output (v2 API, helpers, structure)
      expect(buttonTemplate).toMatch(/const figma = require\("figma"\)/)
      expect(buttonTemplate).toMatch(/figma\.selectedInstance\.getString/)
      expect(buttonTemplate).toMatch(/figma\.selectedInstance\.getBoolean/)
      expect(buttonTemplate).toMatch(/figma\.helpers\.react\.renderProp/)
      expect(buttonTemplate).toMatch(
        /export default \{[^]*id:[^]*imports:[^]*example:[^]*metadata:/,
      )

      expect(avatarTemplate).toMatch(/const figma = require\("figma"\)/)
      expect(avatarTemplate).toMatch(/figma\.selectedInstance\.getString/)
      expect(avatarTemplate).toMatch(/figma\.helpers\.react\.renderProp/)
      expect(avatarTemplate).toMatch(/export default \{[^]*id:[^]*imports:[^]*example:/)

      // Check that the templates contain the component usage
      expect(buttonTemplate).toContain('<Button')
      expect(avatarTemplate).toContain('<Avatar')

      // Check that nestable is preserved in metadata (simple JSX example should be nestable: true)
      expect(buttonTemplate).toContain('metadata: { nestable: true }')
      // Check that __props has been removed (no longer needed for parserless templates)
      expect(buttonTemplate).not.toContain('__props')

      // Verify the generated .figma.js files are valid — parseRawFile should succeed
      const buttonParsed = parseRawFile(buttonTemplatePath, undefined)
      expect(buttonParsed.figmaNode).toBeTruthy()
      expect(buttonParsed.template).toBeTruthy()
      const avatarParsed = parseRawFile(avatarTemplatePath, undefined)
      expect(avatarParsed.figmaNode).toBeTruthy()
      expect(avatarParsed.template).toBeTruthy()

      // Check migration completed successfully
      expect(tidyStdOutput(result.stderr)).toContain('Migration complete')
      expect(tidyStdOutput(result.stderr)).toContain('2 migrated')
    } finally {
      cleanupTemplateFiles(testPath)
    }
  })

  it('outputs .figma.ts files when --typescript flag is passed', async () => {
    const testPath = getTestPath('react_basic')

    try {
      const result = await runMigrate(testPath, '--typescript')

      // .figma.ts files were created (not .figma.js)
      const buttonTemplatePath = path.join(testPath, 'Button.figma.ts')
      const avatarTemplatePath = path.join(testPath, 'Avatar.figma.ts')
      expect(existsSync(buttonTemplatePath)).toBe(true)
      expect(existsSync(avatarTemplatePath)).toBe(true)
      expect(existsSync(path.join(testPath, 'Button.figma.js'))).toBe(false)
      expect(existsSync(path.join(testPath, 'Avatar.figma.js'))).toBe(false)

      // Verify the generated .figma.ts files are valid — parseRawFile should succeed
      const buttonParsed = parseRawFile(buttonTemplatePath, undefined)
      expect(buttonParsed.figmaNode).toBeTruthy()
      expect(buttonParsed.template).toBeTruthy()

      expect(tidyStdOutput(result.stderr)).toContain('2 migrated')
    } finally {
      cleanupTemplateFiles(testPath)
    }
  })

  it('skips files that already exist', async () => {
    const testPath = getTestPath('react_basic')

    try {
      // Run migrate once to create the files
      await runMigrate(testPath)

      // Run migrate again - should skip the existing files and exit with error
      try {
        await runMigrate(testPath)
        fail('Expected command to fail when no files are migrated')
      } catch (e: any) {
        expect(e.code).toBe(1)
        expect(tidyStdOutput(e.stderr)).toContain('2 skipped')
        expect(tidyStdOutput(e.stderr)).toContain('already exists')
        expect(tidyStdOutput(e.stderr)).toContain('No files were migrated')
      }
    } finally {
      cleanupTemplateFiles(testPath)
    }
  })

  it('includes imports in the default export when migrating', async () => {
    const testPath = getTestPath('react_basic')

    try {
      const result = await runMigrate(testPath)

      const buttonTemplatePath = path.join(testPath, 'Button.figma.js')
      const buttonTemplate = readFileSync(buttonTemplatePath, 'utf-8')

      // Check imports are in correct position: id, imports, example
      expect(buttonTemplate).toMatch(
        /id:\s*"[^"]+",\s*imports:\s*\[[^]*import \{ Button \}[^]*example:/,
      )

      expect(tidyStdOutput(result.stderr)).toContain('Migration complete')
    } finally {
      cleanupTemplateFiles(testPath)
    }
  })
})
