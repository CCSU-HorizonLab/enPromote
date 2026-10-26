import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import 'dotenv/config';
import * as readline from 'node:readline/promises';
setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7892'));
const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// 去掉 TS 类型注解，变成普通空数组
const messages = [];
const model = google('gemini-3.1-flash-lite');

async function main() {
    while (true) {
        const userInput = (await terminal.question('You: ')).trim();
        if (!userInput) continue;
        if (userInput.toLowerCase() === 'exit') break;

        messages.push({ role: 'user', content: userInput });

        const result = streamText({
            model,
            messages,
        });

        let fullResponse = '';
        process.stdout.write('\nAssistant: ');
        for await (const delta of result.textStream) {
            fullResponse += delta;
            process.stdout.write(delta);
        }
        process.stdout.write('\n\n');

        messages.push({ role: 'assistant', content: fullResponse });
    }

    terminal.close();
}

main().catch(console.error);       