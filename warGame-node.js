const readline = require('readline');

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }
    toString() {
        const names = {11:'J',12:'Q',13:'K',14:'A'};
        return `${names[this.value]||this.value} of ${this.suit}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        const suits = ['Hearts','Diamonds','Clubs','Spades'];
        for (let s of suits) {
            for (let v = 2; v <= 14; v++) {
                this.cards.push(new Card(s, v));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(n = 1) {
        return this.cards.splice(0, n);
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.hand = [];
        this.score = 0;
    }

    playAI(discardPile) {
        if (this.hand.length === 0) return [];

        this.hand.sort((a, b) => b.value - a.value);
        const topOne = this.hand[0];
        const topTwo = this.hand.slice(0, 2);
        const canPlayTwo = this.hand.length >= 2;

        let play;
        if (canPlayTwo) {
            const twoValue = topTwo[0].value + topTwo[1].value;
            const oneValue = topOne.value;
            const shouldPlayTwo = twoValue >= oneValue + 5 || Math.random() > 0.5;
            play = shouldPlayTwo ? this.hand.splice(0, 2) : [this.hand.splice(0, 1)[0]];
        } else {
            play = [this.hand.splice(0, 1)[0]];
        }

        console.log(`${this.name} chooses ${play.length} card(s).`);
        return play;
    }

    pickFromDiscard(discardPile) {
        if (discardPile.length === 0) return;

        discardPile.sort((a, b) => b.value - a.value);
        const best = discardPile.shift();
        this.hand.push(best);
        console.log(`${this.name} picks ${best.toString()} from discard pile.`);
    }

    drawCards(deck, n = 1) {
        const drawn = deck.draw(n);
        this.hand.push(...drawn);
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [new Player('You'), new Player('AI')];
        this.discardPile = [];
        this.initHands();
    }

    initHands() {
        for (const player of this.players) {
            player.drawCards(this.deck, 7);
        }
    }

    async askQuestion(prompt) {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => resolve(answer.trim()));
        });
    }

    displayHand(player) {
        console.log(`${player.name}'s hand:`);
        player.hand.forEach((card, index) => console.log(`[${index}] ${card.toString()}`));
    }

    async choosePlayerCards() {
        while (true) {
            const answer = await this.askQuestion('Choose 1 or 2 cards to play (indexes separated by comma, or type exit): ');
            if (answer.toLowerCase() === 'exit' || answer.toLowerCase() === 'quit') {
                console.log('Exiting game.');
                rl.close();
                process.exit(0);
            }

            const indexes = answer
                .split(',')
                .map((text) => parseInt(text.trim(), 10))
                .filter((n) => Number.isInteger(n));

            if (indexes.length === 0) {
                console.log('No valid choice detected. Playing your first card automatically.');
                return [0];
            }

            if (indexes.length > 2) {
                console.log('Please choose at most 2 cards. Using the first two valid choices.');
            }

            const uniqueIndexes = [...new Set(indexes)].slice(0, 2);
            const validIndexes = uniqueIndexes.filter((i) => i >= 0 && i < this.players[0].hand.length);

            if (validIndexes.length === 0) {
                console.log('Those indexes are invalid. Try again.');
                continue;
            }

            return validIndexes;
        }
    }

    async playTurn() {
        console.log('\n=== New Turn ===');
        this.displayHand(this.players[0]);

        const playerIndexes = await this.choosePlayerCards();
        const playerCards = playerIndexes.map((index) => this.players[0].hand[index]);
        this.players[0].hand = this.players[0].hand.filter((card, index) => !playerIndexes.includes(index));

        const aiCards = this.players[1].playAI(this.discardPile);

        console.log(`You play: ${playerCards.map((card) => card.toString()).join(', ')}`);
        console.log(`AI plays: ${aiCards.map((card) => card.toString()).join(', ')}`);

        const playerScore = playerCards.reduce((sum, card) => sum + card.value, 0);
        const aiScore = aiCards.reduce((sum, card) => sum + card.value, 0);

        const winnerIndex = playerScore >= aiScore ? 0 : 1;
        const loserIndex = 1 - winnerIndex;

        this.players[winnerIndex].score += 1;
        console.log(`${this.players[winnerIndex].name} wins this turn!`);
        console.log(`Turn total: You ${playerScore} vs AI ${aiScore}`);

        this.discardPile.push(...playerCards, ...aiCards);

        if (this.players[loserIndex].hand.length === 0 && this.discardPile.length > 0) {
            console.log(`${this.players[loserIndex].name} has no cards and picks from discard pile.`);
            this.players[loserIndex].pickFromDiscard(this.discardPile);
        }

        for (const player of this.players) {
            if (this.deck.cards.length > 0) {
                player.drawCards(this.deck, 1);
            }
        }

        console.log('Current score:');
        console.log(`You: ${this.players[0].score}`);
        console.log(`AI: ${this.players[1].score}`);

        console.log('\nYour hand now:');
        this.displayHand(this.players[0]);
    }

    async start() {
        let turn = 1;
        while (this.deck.cards.length > 0 || this.players.some((p) => p.hand.length > 0)) {
            console.log(`\n--- Turn ${turn} ---`);
            await this.playTurn();
            turn += 1;
        }

        console.log('\nGame Over!');
        console.log('Final score:');
        console.log(`You: ${this.players[0].score}`);
        console.log(`AI: ${this.players[1].score}`);
        rl.close();
    }
}

const game = new Game();
game.start().catch((error) => {
    console.error('An error occurred:', error);
    rl.close();
    process.exit(1);
});