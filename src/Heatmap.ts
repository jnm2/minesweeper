import { CellCoords, ExplodedCell, Game, OpenCell, UnknownCell } from "./game";

class Constraint {
    constructor(        
        readonly surroundingBombCount: number,
        readonly surroundingCoords: ReadonlyArray<CellCoords>) {
    }

    validate(map: Map) {
        let flagCount = 0;
        let unopenedCount = 0;

        for (const { x, y } of this.surroundingCoords) {
            switch (map.cells[y][x]) {
                case 'flag':
                    flagCount++;
                    // (fallthrough)
                case undefined:
                    unopenedCount++;
            }
        }

        return flagCount <= this.surroundingBombCount
            && this.surroundingBombCount <= unopenedCount;
    }
}

class MapValidator {
    constructor(readonly constraints: Constraint[]) {
    }

    static create(map: Map) {
        const constraints = new Array<Constraint>();

        for (let y = 0; y < map.cells.length; y++) {
            for (let x = 0; x < map.cells[y].length; x++) {
                const cell = map.cells[y][x];
                if (typeof cell === 'number') {
                    const surroundingCoords = map.getSurroundingCellCoords(x, y);
                    if (surroundingCoords.some(c => map.getCellAt(c) === undefined))
                        constraints.push(new Constraint(cell, surroundingCoords))
                }
            }
        }

        return new MapValidator(constraints);
    }

    validate(map: Map) {
        return this.constraints.every(c => c.validate(map));
    }
}

class Map {
    constructor(readonly cells: ReadonlyArray<ReadonlyArray<'flag' | 'safe' | number | undefined>>) {
    }

    static fromGame(game: Game) {
        const rows = new Array<('flag' | number | undefined)[]>(game.height);

        for (let y = 0; y < rows.length; y++) {
            const cells = new Array<('flag' | number | undefined)>(game.width);

            for (let x = 0; x < cells.length; x++) {
                const cell = game.getCellAt(x, y);
                cells[x] =
                    cell instanceof UnknownCell ? (cell.marked ? 'flag' : undefined) :
                    cell instanceof ExplodedCell ? 'flag' :
                    cell instanceof OpenCell ? cell.mineCount :
                    undefined;
            }

            rows[y] = cells;
        }

        return new Map(rows);
    }

    getCellAt(coords: CellCoords) {
        return this.cells[coords.y][coords.x];
    }

    getSurroundingCellCoords(x: number, y: number) {
        return [
            { x: x - 1, y: y - 1 },
            { x: x, y: y - 1 },
            { x: x + 1, y: y - 1 },            
            { x: x - 1, y: y },
            { x: x + 1, y: y },            
            { x: x - 1, y: y + 1 },
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 },
        ].filter(c => c.x >= 0 && c.y >= 0 && c.y < this.cells.length && c.x < this.cells[c.y].length);
    }

    getMapWith(newValue: 'flag' | 'safe', at: CellCoords) {
        const rows = this.cells.slice();

        const cells = rows[at.y].slice();
        cells[at.x] = newValue;
        rows[at.y] = cells;

        return new Map(rows);
    }
}

export class Heatmap {
    constructor(
        readonly candidates: ReadonlyArray<{ x: number, y: number, bombLikelihood: number }>,
        readonly bombLikelihoodElsewhere?: number) {
    }

    getBombLikelihood(x: number, y: number) {
        return this.candidates.find(c => c.x === x && c.y === y)?.bombLikelihood 
            ?? this.bombLikelihoodElsewhere;
    }

    static compute(game: Game) {
        const map = Map.fromGame(game);
        const validator = MapValidator.create(map);

        const solutions = new Array<Map>();

        visit(map);
        function visit(map: Map) {
            if (!validator.validate(map)) return;

            const next = findAdjacentUnopened(map);
            if (next === undefined) {
                solutions.push(map);
                return;
            }

            visit(map.getMapWith('safe', next));
            visit(map.getMapWith('flag', next));
        }

        function findAdjacentUnopened(map: Map) {
            for (const constraint of validator.constraints) {
                for (const surroundingCoord of constraint.surroundingCoords) {
                    if (map.getCellAt(surroundingCoord) === undefined)
                        return surroundingCoord;
                }
            }
        }

        if (solutions.length === 0)
            return new Heatmap([]);

        function allAdjacentUnopened(map: Map) {
            const coords = new Array<CellCoords>();

            for (let y = 0; y < map.cells.length; y++) {
                for (let x = 0; x < map.cells[y].length; x++) {
                    if (map.cells[y][x] === undefined) {
                        const surroundingCoords = map.getSurroundingCellCoords(x, y);
                        if (surroundingCoords.some(c => typeof map.getCellAt(c) === 'number'))
                            coords.push({ x, y });
                    }
                }
            }

            return coords;
        }

        return new Heatmap(allAdjacentUnopened(map).map(coords => {
            return {
                ...coords,
                bombLikelihood: solutions.reduce(
                    (prev, solution) => prev + (solution.getCellAt(coords) === 'flag' ? 1 : 0),
                    0) / solutions.length,
            };
        }));
    }
}
