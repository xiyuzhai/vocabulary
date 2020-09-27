import { Lexer, Token, TokenPosition, TokenError } from 'typescript-parsec';

class TokenImpl<T> implements Token<T> {
    private nextToken: Token<T> | undefined | null;

    constructor(
        private readonly lexer: LexerImpl<T>,
        private readonly input: string,
        public kind: T,
        public text: string,
        public pos: TokenPosition,
        public keep: boolean
    ) {
    }

    public get next(): Token<T> | undefined {
        if (this.nextToken === undefined) {
            this.nextToken = this.lexer.parseNextAvailable(
                this.input,
                this.pos.index + this.text.length,
                this.pos.rowEnd,
                this.pos.columnEnd
            );
            if (this.nextToken === undefined) {
                this.nextToken = null;
            }
        }

        return this.nextToken === null ? undefined : this.nextToken;
    }
}

class LexerImpl<T> implements Lexer<T> {
    constructor(public rules: [boolean, RegExp, T][]) {
        for (const rule of this.rules) {
            if (rule[1].source[0] !== '^') {
                throw new Error(`Regular expression patterns for a tokenizer should start with "^": ${rule[1].source}`);
            }
            if (!rule[1].global) {
                throw new Error(`Regular expression patterns for a tokenizer should be global: ${rule[1].source}`);
            }
        }
    }

    public parse(input: string): TokenImpl<T> | undefined {
        return this.parseNextAvailable(input, 0, 1, 1);
    }

    public parseNext(input: string, indexStart: number, rowBegin: number, columnBegin: number): TokenImpl<T> | undefined {
        if (indexStart === input.length) {
            return undefined;
        }

        const subString = input.substr(indexStart);
        let result: TokenImpl<T> | undefined;
        for (const [keep, regexp, kind] of this.rules) {
            regexp.lastIndex = 0;
            if (regexp.test(subString)) {
                const text = subString.substr(0, regexp.lastIndex);
                let rowEnd = rowBegin;
                let columnEnd = columnBegin;
                for (const c of text) {
                    switch (c) {
                        case '\r': break;
                        case '\n': rowEnd++; columnEnd = 1; break;
                        default: columnEnd++;
                    }
                }

                result = new TokenImpl<T>(this, input, kind, text, { index: indexStart, rowBegin, columnBegin, rowEnd, columnEnd }, keep);
                break
            }
        }

        if (result === undefined) {
            throw new TokenError(
                { index: indexStart, rowBegin, columnBegin, rowEnd: rowBegin, columnEnd: columnBegin },
                `Unable to tokenize the rest of the input: ${input.substr(indexStart)}`
            );
        } else {
            return result;
        }
    }

    public parseNextAvailable(input: string, index: number, rowBegin: number, columnBegin: number): TokenImpl<T> | undefined {
        let token: TokenImpl<T> | undefined;
        while (true) {
            token = this.parseNext(
                input,
                (token === undefined ? index : token.pos.index + token.text.length),
                (token === undefined ? rowBegin : token.pos.rowEnd),
                (token === undefined ? columnBegin : token.pos.columnEnd)
            );
            if (token === undefined) {
                return undefined;
            } else if (token.keep) {
                return token;
            }
        }
    }
}

export function buildLexer<T>(rules: [boolean, RegExp, T][]): Lexer<T> {
    return new LexerImpl<T>(rules);
}