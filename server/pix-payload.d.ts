declare module "pix-payload" {
  interface PixPayloadOptions {
    key: string;
    name: string;
    city: string;
    transactionId?: string;
    amount?: number;
  }
  export function payload(options: PixPayloadOptions): string;
}
