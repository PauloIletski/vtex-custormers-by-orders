type RequestFn<T> = () => Promise<T>;

export class RequestQueue {
  private queue: Array<() => void> = [];
  private interval: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(intervalMs: number) {
    this.interval = intervalMs;
  }

  public add<T>(fn: RequestFn<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(() => {
        fn().then(resolve).catch(reject);
      });
      this.process();
    });
  }

  private process() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.timer = setInterval(() => {
      const job = this.queue.shift();
      if (job) job();
      if (this.queue.length === 0) {
        if (this.timer) clearInterval(this.timer);
        this.isProcessing = false;
      }
    }, this.interval);
  }
}
