import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { GroupNode, LayerNode, PSD, RootNode } from '../src/index.ts';

const open = (name: string) => new PSD(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));

describe('tree', () => {
  const psd = open('example.psd');
  const tree = psd.tree;

  it('builds the hierarchy', () => {
    assert.ok(tree instanceof RootNode);
    assert.equal(tree, psd.tree);
    assert.equal(tree.children.length, 3);
    assert.equal(tree.toJSON().children.length, 3);
  });

  it('identifies the root', () => {
    assert.equal(tree.type, 'root');
    assert.equal(tree.root, tree);
    assert.equal(tree.children.at(-1)!.root, tree);
    assert.equal(tree.parent, null);
  });

  it('finds descendants and the subtree', () => {
    const descendants = tree.descendants();
    assert.equal(descendants.length, 12);
    assert.equal(descendants.filter((n) => n.type === 'layer').length, 9);
    assert.equal(descendants.filter((n) => n.type === 'group').length, 3);
    assert.notEqual(descendants[0], tree);
    assert.equal(tree.subtree().length, 13);
    assert.equal(tree.subtree()[0], tree);
  });

  it('finds siblings', () => {
    const [first, second] = tree.children;
    assert.equal(first!.siblings, tree.children);
    assert.equal(first!.nextSibling, second);
    assert.equal(second!.prevSibling, first);
    assert.equal(first!.prevSibling, undefined);
  });

  it('calculates depth', () => {
    assert.equal(tree.depth, 0);
    assert.equal(tree.children[0]!.depth, 1);
    assert.equal(tree.descendants().filter((n) => n.type === 'layer').at(-1)!.depth, 2);
  });

  it('generates paths', () => {
    const node = tree.childrenAtPath('Version A/Matte')[0]!;
    assert.ok(node instanceof LayerNode);
    assert.equal(node.path, 'Version A/Matte');
    assert.deepEqual(node.ancestors().map((n) => n.name), ['Version A']);
  });

  it('searches by path', () => {
    assert.equal(tree.childrenAtPath(['Version A', 'Matte']).length, 1);
    assert.equal(tree.childrenAtPath('/Version A/Matte').length, 1);
    assert.equal(tree.childrenAtPath('version a/matte').length, 1);
    assert.equal(tree.childrenAtPath('version a/matte', { caseSensitive: true }).length, 0);
    assert.deepEqual(tree.childrenAtPath('NOPE'), []);
  });

  it('finds nodes by layer ID', () => {
    const node = tree.childrenAtPath('Version A/Matte')[0]!;
    assert.equal(tree.findById(node.id!), node);
  });

  it('exports node data', () => {
    const json = tree.childrenAtPath('Version A')[0]!.toJSON();
    assert.equal(json.type, 'group');
    assert.equal(json.name, 'Version A');
    assert.ok('children' in json && json.children.length > 0);
    assert.equal(JSON.parse(JSON.stringify(tree)).children.length, 3);
  });
});

describe('layer comps', () => {
  const tree = open('example.psd').tree;

  it('throws for unknown comps', () => {
    assert.throws(() => tree.filterByComp('WAT'), /Layer comp not found/);
  });

  it('applies comp visibility to a new tree', () => {
    const filtered = tree.filterByComp('Version A');
    assert.notEqual(filtered, tree);
    assert.equal(filtered.children.length, 3);
    assert.equal(filtered.childrenAtPath('Version A')[0]!.visible, true);
    assert.equal(filtered.childrenAtPath('Version B')[0]!.visible, false);
    // The original tree is untouched.
    assert.equal(tree.childrenAtPath('Version B')[0]!.forceVisible, undefined);
  });

  it('reports visibility per comp', () => {
    const group = tree.childrenAtPath('Version B')[0]!;
    assert.equal(group.visibleInComp('Version A'), false);
    assert.equal(group.visibleInComp('Version B'), true);
    assert.deepEqual(group.positionInComp(725235304), { top: group.top, left: group.left, bottom: group.bottom, right: group.right });
  });
});

describe('group dimensions', () => {
  it('ignores empty layers', () => {
    const tree = open('empty-layer.psd').tree;
    assert.equal(tree.childrenAtPath('group/empty layer')[0]!.isEmpty, true);
    const group = tree.children[0]!;
    assert.equal(group.isEmpty, false);
    assert.deepEqual([group.width, group.height, group.left, group.top], [100, 100, 450, 450]);
  });

  it('ignores empty nested groups', () => {
    const tree = open('empty-layer-subgroups.psd').tree;
    assert.equal(tree.childrenAtPath('group/not empty')[0]!.isEmpty, false);
    for (const path of ['group/Group 2', 'group/Group 2/Group 1', 'group/Group 2/subgroup 1/subgroup 2', 'group/Group 2/subgroup 1/subgroup 2/empty layer']) {
      assert.equal(tree.childrenAtPath(path)[0]!.isEmpty, true, path);
    }
    const group = tree.children[0]!;
    assert.ok(group instanceof GroupNode);
    assert.deepEqual([group.width, group.height, group.left, group.top], [264, 198, 448, 356]);
  });
});

describe('locking', () => {
  const tree = open('locked.psd').tree;
  // [position, all, composite, transparency]
  const expected: Array<[string, boolean[]]> = [
    ['0', [true, true, true, true]],
    ['1', [true, false, false, false]],
    ['2', [false, false, true, false]],
    ['3', [false, false, false, true]],
    ['4', [true, false, true, false]],
    ['5', [true, false, false, true]],
    ['6', [false, false, false, false]],
    ['7', [true, true, true, true]],
    ['7/0', [true, true, true, true]],
    ['7/1', [true, true, true, true]],
    ['7/1/0', [true, true, true, true]],
    ['8', [true, false, false, true]],
    ['9', [true, true, true, true]],
    ['12', [false, false, false, false]],
  ];

  for (const [path, locks] of expected) {
    it(`reads locks for child ${path}, including inherited ones`, () => {
      const node = path.split('/').reduce<{ children: typeof tree.children }>((n, i) => n.children[Number(i)]!, tree);
      assert.ok(node instanceof GroupNode || node instanceof LayerNode);
      assert.deepEqual([node.positionLocked, node.allLocked, node.compositeLocked, node.transparencyLocked], locks);
    });
  }
});
