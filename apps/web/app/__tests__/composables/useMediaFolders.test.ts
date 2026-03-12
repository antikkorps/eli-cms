import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMediaFolders } from '~/composables/useMediaFolders.js';

describe('useMediaFolders', () => {
  beforeEach(() => {
    // Reset singleton state
    const folders = useMediaFolders();
    folders.invalidate();
    // @ts-expect-error -- reset internal state
    folders.tree.value = [];
  });

  it('starts with empty tree', () => {
    const { tree, loaded, loading } = useMediaFolders();
    expect(tree.value).toEqual([]);
    expect(loaded.value).toBe(false);
    expect(loading.value).toBe(false);
  });

  it('flatten returns empty array for empty tree', () => {
    const { flatten } = useMediaFolders();
    expect(flatten()).toEqual([]);
  });

  it('flatten returns flat list from tree', () => {
    const { flatten } = useMediaFolders();
    const tree = [
      {
        id: '1',
        name: 'Photos',
        slug: 'photos',
        parentId: null,
        children: [
          {
            id: '2',
            name: 'Portraits',
            slug: 'portraits',
            parentId: '1',
            children: [],
          },
        ],
      },
      {
        id: '3',
        name: 'Documents',
        slug: 'documents',
        parentId: null,
        children: [],
      },
    ];

    const result = flatten(tree);
    expect(result).toEqual([
      { id: '1', name: 'Photos', depth: 0 },
      { id: '2', name: 'Portraits', depth: 1 },
      { id: '3', name: 'Documents', depth: 0 },
    ]);
  });

  it('flatten handles deeply nested folders', () => {
    const { flatten } = useMediaFolders();
    const tree = [
      {
        id: '1',
        name: 'Level 0',
        slug: 'l0',
        parentId: null,
        children: [
          {
            id: '2',
            name: 'Level 1',
            slug: 'l1',
            parentId: '1',
            children: [
              {
                id: '3',
                name: 'Level 2',
                slug: 'l2',
                parentId: '2',
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const result = flatten(tree);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ id: '3', name: 'Level 2', depth: 2 });
  });

  it('fetch loads folders from API', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: [{ id: '1', name: 'Photos', slug: 'photos', parentId: null, children: [] }],
    });

    const folders = useMediaFolders();
    await folders.fetch();

    expect(folders.tree.value).toHaveLength(1);
    expect(folders.loaded.value).toBe(true);
  });

  it('invalidate resets loaded flag', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({ success: true, data: [] });

    const folders = useMediaFolders();
    await folders.fetch();
    expect(folders.loaded.value).toBe(true);

    folders.invalidate();
    expect(folders.loaded.value).toBe(false);
  });
});
