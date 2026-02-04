import { Container } from "@cloudflare/containers";

export class LexiProBackend extends Container {
  defaultPort = 8787;
  sleepAfter = "30m";
  enableInternet = true;
  pingEndpoint = "/health";
  envVars = {
    NODE_ENV: "production"
  };
}

export default {
  async fetch(request: Request, env: { LEXIPRO_BACKEND: DurableObjectNamespace }) {
    const container = env.LEXIPRO_BACKEND.getByName("lexipro-backend");
    await container.startAndWaitForPorts();
    return container.fetch(request);
  }
};
