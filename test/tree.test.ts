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

describe('layer kinds', () => {
  const kinds = (name: string) => open(name).tree.descendants().map((n) => [n.name, n.kind]);

  it('identifies groups, text, shapes, smart objects and pixel layers', () => {
    assert.deepEqual(kinds('example.psd').slice(0, 4), [
      ['Version C', 'group'],
      ['Make a change and save.', 'text'],
      ['Logo_Glyph', 'shape'], // a CS-era shape: a fill layer with a vector mask
      ['Matte', 'pixel'],
    ]);
    const slices = open('slices.psd').tree;
    assert.equal(slices.childrenAtPath('navigation-bar/status-bar')[0]!.kind, 'smartObject');
    assert.equal(slices.childrenAtPath('navigation-bar/status-bar')[0]!.toJSON().kind, 'smartObject');
  });

  it('identifies fill and adjustment layers', () => {
    assert.deepEqual(kinds('solid-color-fill.psd'), [['Color Fill 1', 'fill']]);
    // An adjustment layer with a vector mask is still an adjustment layer.
    assert.deepEqual(kinds('curves-with-vectormask.psd'), [['Curves 1', 'adjustment']]);
  });

  it('tells shapes from pixel layers with vector masks', () => {
    assert.deepEqual(kinds('vector-mask2.psd'), [
      ['Color Fill 1', 'pixel'], // rasterized, with a vector mask drawn with a shape tool
      ['Masked Rectangle 1', 'pixel'],
      ['Shape 2', 'shape'], // pattern fill
      ['Shape 1', 'shape'], // gradient fill
      ['Line 1', 'shape'],
      ['Polygon 1', 'shape'], // newer shapes keep their fill in vscg
      ['Ellipse 1', 'shape'],
      ['Rounded Rectangle 1', 'shape'],
      ['Rectangle 1', 'shape'],
      ['Gradient Fill 1', 'shape'], // a fill layer with a vector mask
    ]);
  });
});

describe('unbalanced group markers', () => {
  const layer = (name: string, kind?: 'start' | 'end') => ({
    ...{ name, isFolder: kind === 'start', isFolderEnd: kind === 'end' },
    ...{ top: 0, left: 0, bottom: 1, right: 1, info: {} },
  });
  const build = (...layers: object[]) => new RootNode({ width: 1, height: 1, layers } as unknown as PSD);
  const names = (nodes: Array<GroupNode | LayerNode>): unknown[] =>
    nodes.map((n) => (n.type === 'group' ? { [n.name]: names(n.children) } : n.name));

  it('ignores stray end markers', () => {
    const tree = build(layer('</Layer group>', 'end'), layer('a'), layer('g', 'start'), layer('b'), layer('</Layer group>', 'end'), layer('</Layer group>', 'end'), layer('c'));
    assert.deepEqual(names(tree.children), ['a', { g: ['b'] }, 'c']);
  });

  it('keeps groups that are never closed', () => {
    const tree = build(layer('a'), layer('g', 'start'), layer('b'), layer('h', 'start'), layer('c'));
    assert.deepEqual(names(tree.children), ['a', { g: ['b', { h: ['c'] }] }]);
    assert.equal(tree.childrenAtPath('g/h/c')[0]!.depth, 3);
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
  });

  it('applies comp offsets once', () => {
    // No fixture moves a layer in a comp, so this uses a minimal stand-in document.
    const comp = { id: 1, name: 'Moved', capturedInfo: 0b011 };
    const layer = {
      ...{ isFolder: false, isFolderEnd: false, clipped: false, visible: true },
      ...{ top: 10, left: 20, bottom: 30, right: 40 },
      info: { metadata: { layerComp: { layerSettings: [{ enab: false, Ofst: { Hrzn: 5, Vrtc: 7 }, compList: [1] }] } } },
    };
    const psd = { width: 100, height: 100, layers: [layer], resources: { layerComps: [comp] } } as unknown as PSD;
    const original = new RootNode(psd).children[0]!;
    const moved = original.root.filterByComp('Moved').children[0]!;

    assert.deepEqual([moved.top, moved.left, moved.visible], [17, 25, false]);
    assert.deepEqual(moved.positionInComp(comp), original.positionInComp(comp));
    // The original tree is untouched.
    assert.deepEqual([original.top, original.left, original.visible], [10, 20, true]);
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
