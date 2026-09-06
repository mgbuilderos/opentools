declare module 'qrcode' {
  interface QrOptions {
    type: 'svg';
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toString(text: string, options: QrOptions): Promise<string>;
  };

  export default QRCode;
}
