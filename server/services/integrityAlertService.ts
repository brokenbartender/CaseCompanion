type AlertClient = {
  write: (chunk: string) => void;
};

const clients = new Set<AlertClient>();

export const integrityAlertService = {
  register(client: AlertClient) {
    clients.add(client);
  },
  unregister(client: AlertClient) {
    clients.delete(client);
  },
  broadcast(payload: any) {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    clients.forEach((client) => {
      try {
        client.write(message);
      } catch {
        clients.delete(client);
      }
    });
  }
};
