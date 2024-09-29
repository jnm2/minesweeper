import { test } from 'uvu';
import { expect } from 'chai';
import { Map, Heatmap } from './Heatmap';

test('validates constraints before starting', () => {
    const map = new Map([
        [2, 'flag', undefined],
        ['flag', 'flag', 2],
    ]);

    expect(map.validateAll(3)).to.equal(false);

    const heatmap = Heatmap.compute({ map, mineCount: 3 });
    expect(heatmap.getBombLikelihood(0, 2)).to.be.undefined;
});

test('validates flags against bomb count before starting', () => {
    // Otherwise, the heatmap shows negative values (blue tint).
    const map = new Map([
        ['flag', 'flag', undefined],
    ]);

    expect(map.validateAll(1)).to.equal(false);

    const heatmap = Heatmap.compute({ map, mineCount: 1 });
    expect(heatmap.getBombLikelihood(0, 2)).to.be.undefined;
});

test('solutions with too many flags for the total mine count are not suggested', () => {
    const map = new Map([
        ['flag', 2, 1],
        [2, undefined, undefined],
        [1, undefined, undefined],
    ]);

    const heatmap = Heatmap.compute({ map, mineCount: 2 });
    expect(heatmap.getBombLikelihood(1, 1)).to.equal(1);
    expect(heatmap.getBombLikelihood(1, 2)).to.equal(0);
    expect(heatmap.getBombLikelihood(2, 1)).to.equal(0);
    expect(heatmap.getBombLikelihood(2, 2)).to.equal(0);
});

test('solutions with too few flags for the total mine count are not suggested', () => {
    const map = new Map([
        ['flag', 2, 1],
        [2, undefined, undefined],
        [1, undefined, undefined],
    ]);

    const heatmap = Heatmap.compute({ map, mineCount: 4 });
    expect(heatmap.getBombLikelihood(1, 1)).to.equal(0);
    expect(heatmap.getBombLikelihood(1, 2)).to.equal(1);
    expect(heatmap.getBombLikelihood(2, 1)).to.equal(1);
    expect(heatmap.getBombLikelihood(2, 2)).to.equal(1);
});

test.run();
