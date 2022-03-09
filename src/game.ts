export class UnknownCell {
    constructor(readonly marked: boolean) {
    }
}

export class OpenCell {
    constructor(readonly mineCount: number) {
    }
}

export class ExplodedCell { }

export type CellCoords = { x: number, y: number };

export class Game {
    private stateMap: (undefined | 'marked' | 'revealed')[][];
    private mineMap: ('bomb' | number)[][] | null;
    private remainingToOpen: number;
    private gameConclusion: (null | 'win' | 'loss');

    constructor(readonly width: number, readonly height: number, readonly mineCount: number) {
        this.remainingToOpen = width * height - mineCount;
        this.gameConclusion = null;

        this.stateMap = new Array(height);
        for (let y = 0; y < height; y++)
            this.stateMap[y] = new Array(width);

        this.mineMap = null;
    }

    get conclusion(): null | 'win' | 'loss' { return this.gameConclusion; }

    getCellAt(x: number, y: number): UnknownCell | ExplodedCell | OpenCell {
        const state = this.stateMap[y][x];

        if (state !== 'revealed')
            return new UnknownCell(state === 'marked');

        if (!this.mineMap) throw 'mineMap should be initialized before any cell state is revealed.';
        const contents = this.mineMap[y][x];
        return contents === 'bomb' ? new ExplodedCell() : new OpenCell(contents);
    }

    tryToggleMark(x: number, y: number): boolean {
        const state = this.stateMap[y][x];
        if (state === 'revealed') return false;

        this.stateMap[y][x] = state === 'marked' ? undefined : 'marked';
        return true;
    }

    tryOpen(x: number, y: number): boolean {
        const state = this.stateMap[y][x];
        if (state === 'revealed' || state === 'marked') return false;

        if (this.mineMap === null)
            this.initializeMines({ x, y });

        if (!this.mineMap) throw 'mineMap should be initialized before any cell state is revealed.';
        const contents = this.mineMap[y][x];

        if (contents === 'bomb')
            this.explode();
        else
            this.openKnownGoodCell(x, y);

        return true;
    }

    openSurroundingIfSatisfied(x: number, y: number): boolean {
        const cell = this.getCellAt(x, y);

        if (cell instanceof OpenCell) {
            const surroundingCoords = this.getSurroundingCoordinates(x, y);

            const openable = new Array<CellCoords>();
            let markCount = 0;

            for (let i = 0; i < surroundingCoords.length; i++) {
                const coords = surroundingCoords[i];
                const state = this.stateMap[coords.y][coords.x];

                if (state === 'marked') {
                    markCount++;
                } else if (state !== 'revealed') {
                    openable.push(coords);
                }
            }

            if (markCount === cell.mineCount) {
                for (let i = 0; i < openable.length; i++) {
                    const coords = openable[i];
                    this.tryOpen(coords.x, coords.y);
                    if (this.gameConclusion) break;
                }

                return true;
            }
        }

        return false;
    }

    private initializeMines(guaranteedCell: CellCoords) {
        this.mineMap = new Array(this.height);
        for (let y = 0; y < this.height; y++)
            this.mineMap[y] = new Array(this.width).fill(0);

        for (let plantedCount = 0; plantedCount < this.mineCount;) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);

            if (Math.abs(x - guaranteedCell.x) <= 1 && Math.abs(y - guaranteedCell.y) <= 1) continue;
            if (this.mineMap[y][x] === 'bomb') continue;

            this.mineMap[y][x] = 'bomb';

            const allSurrounding = this.getSurroundingCoordinates(x, y);
            for (let i = 0; i < allSurrounding.length; i++) {
                const surrounding = allSurrounding[i];
                const contents = this.mineMap[surrounding.y][surrounding.x];
                if (contents !== 'bomb')
                    this.mineMap[surrounding.y][surrounding.x] = contents + 1;
            }

            plantedCount++;
        }

        console.log(this.mineMap);
    }

    private explode() {
        if (!this.mineMap) throw 'mineMap should be initialized before any cell state is revealed.';

        this.gameConclusion = 'loss';

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.mineMap[y][x] === 'bomb') {
                    this.stateMap[y][x] = 'revealed';
                }
            }
        }
    }

    private openKnownGoodCell(x: number, y: number) {
        if (!this.mineMap) throw 'mineMap should be initialized before any cell state is revealed.';

        let knownGoodCells = [{ x, y }];

        for (;;) {
            const cell = knownGoodCells.pop();
            if (!cell) break;

            const state = this.stateMap[cell.y][cell.x];
            if (state === 'marked' || state === 'revealed') continue;

            this.stateMap[cell.y][cell.x] = 'revealed';

            this.remainingToOpen--;
            if (this.remainingToOpen === 0) {
                this.gameConclusion = 'win';

                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        if (this.mineMap[y][x] === 'bomb') {
                            this.stateMap[y][x] = 'marked';
                        }
                    }
                }

                break;
            }

            if (this.mineMap[cell.y][cell.x] === 0)
                knownGoodCells = knownGoodCells.concat(this.getSurroundingCoordinates(cell.x, cell.y));
        }
    }

    private getSurroundingCoordinates(x: number, y: number) {
        const coordinates = new Array<CellCoords>();

        if (y > 0)
            coordinates.push({ x, y: y - 1 });
        if (y < this.height - 1)
            coordinates.push({ x, y: y + 1 });

        if (x > 0) {
            coordinates.push({ x: x - 1, y });
            if (y > 0)
                coordinates.push({ x: x - 1, y: y - 1 });
            if (y < this.height - 1)
                coordinates.push({ x: x - 1, y: y + 1 });
        }

        if (x < this.width - 1) {
            coordinates.push({ x: x + 1, y });
            if (y > 0)
                coordinates.push({ x: x + 1, y: y - 1 });
            if (y < this.height - 1)
                coordinates.push({ x: x + 1, y: y + 1 });
        }

        return coordinates;
    }
}
