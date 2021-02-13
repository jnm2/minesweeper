import { Game } from './game';
import { Renderer } from './renderer';

const game = new Game(10, 10, 21);

new Renderer(game, document.getElementById('minefield-container')!);
