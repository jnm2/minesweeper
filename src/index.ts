import { Game } from './game';
import { Renderer } from './renderer';

const game = new Game(30, 16, 99);

new Renderer(game, document.getElementById('minefield-container')!);
