import { promisify } from 'util'
import { exec } from 'child_process'
import path from 'path'

describe('e2e test for deprecated --include-template-files flag', () => {
  /**
   * @description Test that the --include-template-files flag shows a deprecation
   * warning instead of causing an error
   */
  it('shows deprecation warning for --include-template-files flag on parse command', async () => {
    const testPath = path.join(__dirname, 'e2e_parse_command/react_storybook')

    const result = await promisify(exec)(
      `npx tsx ../../../cli connect parse --skip-update-check --include-template-files --dir ${testPath}`,
      {
        cwd: __dirname,
      },
    )

    // Check that the deprecation warning is shown
    expect(result.stderr).toContain(
      '[Deprecated] The --include-template-files flag is no longer needed',
    )
    expect(result.stderr).toContain('it will be removed in a future version')

    // Check that the command still succeeds and produces output
    expect(result.stdout).toBeTruthy()
    const json = JSON.parse(result.stdout)
    expect(Array.isArray(json)).toBe(true)
  })

  /**
   * @description Test that commands still work without the flag (baseline)
   */
  it('parse command works without the deprecated flag', async () => {
    const testPath = path.join(__dirname, 'e2e_parse_command/react_storybook')

    const result = await promisify(exec)(
      `npx tsx ../../../cli connect parse --skip-update-check --dir ${testPath}`,
      {
        cwd: __dirname,
      },
    )

    // Should NOT show the deprecation warning when flag is not used
    expect(result.stderr).not.toContain(
      '[Deprecated] The --include-template-files flag is no longer needed',
    )

    // Command should still work
    expect(result.stdout).toBeTruthy()
    const json = JSON.parse(result.stdout)
    expect(Array.isArray(json)).toBe(true)
  })
})
