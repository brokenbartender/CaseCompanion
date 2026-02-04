type TaskFn<T> = () => Promise<T>;

class TaskQueue {
  private queue: Array<{
    fn: TaskFn<unknown>;
    resolve: (value: unknown) => void;
    reject: (err: unknown) => void;
  }> = [];
  private running = false;

  enqueue<T>(fn: TaskFn<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as TaskFn<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      this.runNext();
    });
  }

  private async runNext() {
    if (this.running) return;
    const next = this.queue.shift();
    if (!next) return;
    this.running = true;
    try {
      const result = await next.fn();
      next.resolve(result);
    } catch (err) {
      next.reject(err);
    } finally {
      this.running = false;
      if (this.queue.length) {
        this.runNext();
      }
    }
  }
}

export const agentTaskQueue = new TaskQueue();
