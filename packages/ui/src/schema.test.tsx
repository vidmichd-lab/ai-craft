import { describe, expect, it } from 'vitest';
import { parseUISchemaDocument, renderUISchemaToHtml } from './schema';

describe('ui schema', () => {
  it('rejects unknown node types', () => {
    expect(() =>
      parseUISchemaDocument({
        version: 1,
        root: {
          type: 'unknown'
        }
      })
    ).toThrow();
  });

  it('renders allowed schema through shared ui', () => {
    const html = renderUISchemaToHtml(
      {
        version: 1,
        root: {
          type: 'form-section',
          title: 'Profile',
          children: [
            {
              type: 'input-field',
              name: 'displayName',
              label: 'Name'
            },
            {
              type: 'button',
              label: 'Save',
              buttonType: 'submit'
            }
          ]
        }
      },
      {
        values: {
          displayName: 'Alice'
        }
      }
    );

    expect(html).toContain('Profile');
    expect(html).toContain('Name');
    expect(html).toContain('Save');
    expect(html).toContain('Alice');
  });
});
