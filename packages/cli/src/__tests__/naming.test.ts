import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slugToInterfaceName } from '../naming.js';

describe('slugToInterfaceName', () => {
  it('converts simple slug', () => {
    assert.equal(slugToInterfaceName('hero'), 'Hero');
  });

  it('converts kebab-case slug', () => {
    assert.equal(slugToInterfaceName('blog-post'), 'BlogPost');
  });

  it('converts multi-segment slug', () => {
    assert.equal(slugToInterfaceName('my-long-slug-name'), 'MyLongSlugName');
  });

  it('handles single character segments', () => {
    assert.equal(slugToInterfaceName('a-b-c'), 'ABC');
  });
});
