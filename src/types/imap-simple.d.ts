declare module "imap-simple" {
  interface ImapConfig {
    imap: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      tlsOptions?: { rejectUnauthorized?: boolean };
      authTimeout?: number;
    };
  }
  interface Message {
    attributes: any;
    parts: { which: string; body: any }[];
  }
  interface Connection {
    openBox(box: string): Promise<void>;
    search(criteria: any[], options: any): Promise<Message[]>;
    end(): void;
  }
  function connect(config: ImapConfig): Promise<Connection>;
  export default { connect };
}

declare module "mailparser" {
  interface ParsedMail {
    from?: { value: { address: string; name: string }[] };
    subject?: string;
    text?: string;
    date?: Date;
    messageId?: string;
  }
  function simpleParser(source: string): Promise<ParsedMail>;
  export { simpleParser };
}
