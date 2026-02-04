import readline from "node:readline";
import dotenv from "dotenv";
import { runAgentStream } from "../server/agent/agentEngine.js";

dotenv.config({ path: "server/.env" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("LEXIPRO ARCHITECT ONLINE. (Type 'exit' to quit)");
console.log("---------------------------------------------------");

const ask = () => {
  rl.question("YOU: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close();
      process.exit(0);
    }

    await runAgentStream("dev-workspace", "dev-user", input, (log) => console.log(`  > ${log}`));
    ask();
  });
};

ask();
